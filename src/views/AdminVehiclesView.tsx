import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { ApiService } from '../services/api';
import { FirestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { VehicleEditModal } from '../components/VehicleEditModal';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Ship,
  Anchor,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface AdminVehiclesViewProps {
  onViewVehicle: (vehicle: Vehicle) => void;
  onOpenUpload: () => void;
  initialFilter?: VehicleStatus | 'ALL';
}

export const AdminVehiclesView: React.FC<AdminVehiclesViewProps> = ({
  onViewVehicle,
  onOpenUpload,
  initialFilter = 'ALL',
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'ALL'>(initialFilter);
  const [vesselFilter, setVesselFilter] = useState<string>('ALL');
  const [availableVessels, setAvailableVessels] = useState<string[]>([]);
  const [registeredVessels, setRegisteredVessels] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'serialNumber' | 'chassisNumber' | 'updatedAt'>('serialNumber');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [vehicleToUndo, setVehicleToUndo] = useState<Vehicle | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Manual Add Vehicle Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newChassis, setNewChassis] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVessel, setNewVessel] = useState('MV TRANS CARRIER');
  const [newVoyage, setNewVoyage] = useState('VOY-2026/08');

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const [data, vesselList] = await Promise.all([
        ApiService.getVehicles(
          {
            status: statusFilter,
            vesselName: vesselFilter !== 'ALL' ? vesselFilter : undefined,
            search: searchQuery,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
          user
        ),
        ApiService.getVessels(false, user).catch(() => []),
      ]);
      setVehicles(data);
      setRegisteredVessels(vesselList);

      // Extract unique vessels across vehicles and registered vessels
      const vesselsSet = new Set<string>();
      data.forEach((v) => {
        if (v.vesselName) vesselsSet.add(v.vesselName);
      });
      vesselList.forEach((v: any) => {
        if (v.name) vesselsSet.add(v.name);
      });

      if (vesselsSet.size > 0) {
        setAvailableVessels(Array.from(vesselsSet).sort());
      }

      setCurrentPage(1);
    } catch (err: any) {
      showError(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();

    // Live real-time Firestore sync
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = FirestoreService.subscribeVehicles((liveVehicles) => {
        if (Array.isArray(liveVehicles)) {
          let filtered = liveVehicles;
          if (statusFilter !== 'ALL') {
            filtered = filtered.filter((v) => v.status === statusFilter);
          }
          if (vesselFilter !== 'ALL') {
            filtered = filtered.filter((v) => v.vesselName?.toUpperCase() === vesselFilter.toUpperCase());
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (v) =>
                v.chassisNumber.toLowerCase().includes(q) ||
                v.description.toLowerCase().includes(q) ||
                (v.vesselName && v.vesselName.toLowerCase().includes(q))
            );
          }
          setVehicles(filtered);
        }
      });
    } catch (e) {
      console.warn('Firestore subscription notice:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [statusFilter, vesselFilter, startDate, endDate, user, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVehicles();
  };

  // Sort & Filter
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'serialNumber') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [vehicles, sortField, sortAsc]);

  // Paginated records
  const totalPages = Math.ceil(sortedVehicles.length / itemsPerPage) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedVehicles.slice(start, start + itemsPerPage);
  }, [sortedVehicles, currentPage]);

  const handleSort = (field: 'serialNumber' | 'chassisNumber' | 'updatedAt') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    setIsActionLoading(true);
    try {
      await ApiService.deleteVehicle(vehicleToDelete.id, user);
      showSuccess(`Vehicle ${vehicleToDelete.chassisNumber} permanently deleted from database.`);
      setVehicleToDelete(null);
      loadVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to delete vehicle');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Undo Release Action (Admin Only)
  const handleUndoReleaseConfirm = async (reason?: string) => {
    if (!vehicleToUndo) return;
    setIsActionLoading(true);
    try {
      const updated = await ApiService.undoPortRelease(vehicleToUndo.id, reason, user);
      showSuccess(
        `Vehicle ${updated.chassisNumber} port release reversed. Status returned to AT PORT.`
      );
      setVehicleToUndo(null);
      loadVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to undo port release');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Edit Action
  const handleEditSave = async (updates: any) => {
    if (!vehicleToEdit) return;
    setIsActionLoading(true);
    try {
      await ApiService.updateVehicle(vehicleToEdit.id, updates, user);
      showSuccess(`Vehicle ${updates.chassisNumber} updated successfully.`);
      setVehicleToEdit(null);
      loadVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to update vehicle');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add Manual Vehicle
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChassis.trim() || !newDesc.trim()) {
      showError('Chassis number and description are required.');
      return;
    }

    try {
      // Import single row via manifest endpoint
      await ApiService.importManifest(
        'Manual Admin Entry',
        [
          {
            serialNumber: newSerial.trim() || vehicles.length + 1,
            chassisNumber: newChassis.trim().toUpperCase(),
            description: newDesc.trim(),
            vesselName: newVessel.trim().toUpperCase() || 'MANUAL VESSEL ENTRY',
            voyageNumber: newVoyage.trim().toUpperCase() || 'VOY-MANUAL',
          },
        ],
        {
          vesselName: newVessel.trim().toUpperCase(),
          voyageNumber: newVoyage.trim().toUpperCase(),
        },
        user
      );
      showSuccess(`Vehicle ${newChassis.toUpperCase()} registered for ${newVessel} with status AT PORT.`);
      setShowAddModal(false);
      setNewSerial('');
      setNewChassis('');
      setNewDesc('');
      loadVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to create vehicle');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (vehicles.length === 0) {
      showError('No vehicles to export.');
      return;
    }

    const exportRows = sortedVehicles.map((v) => ({
      'Serial Number': v.serialNumber,
      'Chassis Number': v.chassisNumber,
      Description: v.description,
      'Marine Vessel': v.vesselName || 'MV TRANS CARRIER',
      'Voyage Number': v.voyageNumber || '—',
      Status: v.status,
      'Released By': v.releasedByName || '—',
      'Release Date & Time': v.releasedAt ? new Date(v.releasedAt).toLocaleString() : '—',
      'Received By': v.receivedByName || '—',
      'Received Date & Time': v.receivedAt ? new Date(v.receivedAt).toLocaleString() : '—',
      'Created At': new Date(v.createdAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
    const vesselSuffix = vesselFilter !== 'ALL' ? `_${vesselFilter.replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(wb, `GALCO_Vehicles_Export${vesselSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Exported ${exportRows.length} vehicle records to Excel.`);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (vehicles.length === 0) {
      showError('No vehicles to export.');
      return;
    }

    const headers = 'Serial Number,Chassis Number,Description,Marine Vessel,Voyage Number,Status,Released By,Release Time,Received By,Received Time\n';
    const rows = sortedVehicles
      .map(
        (v) =>
          `"${v.serialNumber || ''}","${v.chassisNumber || ''}","${(v.description || '').replace(/"/g, '""')}","${
            v.vesselName || ''
          }","${v.voyageNumber || ''}","${v.status || ''}","${v.releasedByName || ''}","${
            v.releasedAt || ''
          }","${v.receivedByName || ''}","${v.receivedAt || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const vesselSuffix = vesselFilter !== 'ALL' ? `_${vesselFilter.replace(/\s+/g, '_')}` : '';
    link.download = `GALCO_Vehicles_Export${vesselSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showSuccess('Exported vehicle records to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Vehicle Management Table
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Complete database records segregated by marine vessels with full audit trail and movement histories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="Clear All Data"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear All Data</span>
          </button>
          <button
            onClick={loadVehicles}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Status & Vessel Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['ALL', 'AT PORT', 'ON TRANSIT', 'RECEIVED AT GALCO'] as (VehicleStatus | 'ALL')[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? st === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : st === 'AT PORT'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : st === 'ON TRANSIT'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'RECEIVED AT GALCO' ? 'Received' : st}
              </button>
            ))}
          </div>

          {/* Marine Vessel Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
              <Ship className="w-3.5 h-3.5 text-blue-600" /> Marine Vessel:
            </span>
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50/80 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Marine Vessels ({availableVessels.length || 2})</option>
              {availableVessels.map((vesselName, idx) => {
                const reg = registeredVessels.find((r) => r.name?.toUpperCase() === vesselName?.toUpperCase());
                const statusTag = reg ? (reg.status === 'COMPLETED' ? ' (Completed)' : reg.isVisibleInOperations ? ' (Active)' : ' (Hidden)') : '';
                return (
                  <option key={`vsl-filter-${vesselName}-${idx}`} value={vesselName}>
                    🚢 {vesselName}{statusTag}
                  </option>
                );
              })}
              {availableVessels.length === 0 && (
                <>
                  <option key="fallback-vsl-1" value="MV TRANS CARRIER">🚢 MV TRANS CARRIER (Active)</option>
                  <option key="fallback-vsl-2" value="MV PACIFIC GLORY">🚢 MV PACIFIC GLORY (Active)</option>
                </>
              )}
            </select>
            {vesselFilter !== 'ALL' && (
              <button
                onClick={() => setVesselFilter('ALL')}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search & Date Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by chassis (e.g. 08999, full VIN), description, vessel or S/N..."
              className="w-full pl-10 pr-20 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
            >
              Search
            </button>
          </form>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th
                  onClick={() => handleSort('serialNumber')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    S/N {sortField === 'serialNumber' && (sortAsc ? '▲' : '▼')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('chassisNumber')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    Chassis Number {sortField === 'chassisNumber' && (sortAsc ? '▲' : '▼')}
                  </span>
                </th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Marine Vessel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Released By</th>
                <th className="py-3 px-4">Release Date & Time</th>
                <th className="py-3 px-4">Received By</th>
                <th className="py-3 px-4">Received Date & Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-sm">
                    <div className="inline-block animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full mb-2" />
                    <p>Loading vehicle records...</p>
                  </td>
                </tr>
              ) : paginatedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-sm">
                    <p className="font-semibold">No vehicles found matching current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search terms or upload a new manifest.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((veh, idx) => (
                  <tr
                    key={`admin-veh-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                    onClick={() => onViewVehicle(veh)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-600">{veh.serialNumber}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {veh.chassisNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 min-w-[180px]">{veh.description}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs">
                        <Ship className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{veh.vesselName || 'MV TRANS CARRIER'}</span>
                        {veh.voyageNumber && (
                          <span className="text-[10px] text-blue-600 font-mono font-normal">
                            ({veh.voyageNumber})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={veh.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {veh.releasedByName || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {veh.releasedAt ? (
                        <div>
                          <div>{new Date(veh.releasedAt).toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(veh.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {veh.receivedByName || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {veh.receivedAt ? (
                        <div>
                          <div>{new Date(veh.receivedAt).toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(veh.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {veh.status === 'ON TRANSIT' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVehicleToUndo(veh);
                            }}
                            title="Undo Port Release (Revert to AT PORT)"
                            className="p-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-100 bg-amber-50 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVehicleToEdit(veh);
                          }}
                          title="Edit / Override Record"
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVehicleToDelete(veh);
                          }}
                          title="Delete Vehicle"
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <strong>{vehicles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, sortedVehicles.length)}</strong> of{' '}
            <strong>{sortedVehicles.length}</strong> total vehicles
            {vesselFilter !== 'ALL' && (
              <span className="ml-1 text-blue-700 font-semibold">(Filtered by {vesselFilter})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!vehicleToDelete}
        type="DELETE"
        vehicle={vehicleToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setVehicleToDelete(null)}
        isLoading={isActionLoading}
      />

      {/* Undo Port Release Confirmation Modal (Admin Only) */}
      <ConfirmationModal
        isOpen={!!vehicleToUndo}
        type="UNDO_RELEASE"
        vehicle={vehicleToUndo}
        onConfirm={handleUndoReleaseConfirm}
        onCancel={() => setVehicleToUndo(null)}
        isLoading={isActionLoading}
      />

      {/* Edit / Override Modal */}
      <VehicleEditModal
        isOpen={!!vehicleToEdit}
        vehicle={vehicleToEdit}
        onClose={() => setVehicleToEdit(null)}
        onSave={handleEditSave}
        isLoading={isActionLoading}
      />

      {/* Manual Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Vehicle Record</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder={`e.g. ${vehicles.length + 1}`}
                  className="w-full p-2.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chassis Number *</label>
                <input
                  type="text"
                  value={newChassis}
                  onChange={(e) => setNewChassis(e.target.value.toUpperCase())}
                  placeholder="e.g. KEEFW108999"
                  className="w-full p-2.5 border rounded-lg uppercase font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Model *</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. TOYOTA LAND CRUISER PRADO"
                  className="w-full p-2.5 border rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marine Vessel *</label>
                  <input
                    type="text"
                    value={newVessel}
                    onChange={(e) => setNewVessel(e.target.value.toUpperCase())}
                    placeholder="MV TRANS CARRIER"
                    className="w-full p-2.5 border rounded-lg uppercase font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voyage Number</label>
                  <input
                    type="text"
                    value={newVoyage}
                    onChange={(e) => setNewVoyage(e.target.value.toUpperCase())}
                    placeholder="VOY-2026/08"
                    className="w-full p-2.5 border rounded-lg uppercase font-semibold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Newly created vehicle will automatically be assigned initial status <strong>AT PORT</strong>.
              </p>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Operational Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Clear All Vehicle Records?</h3>
                <p className="text-xs text-slate-500">Wipe previous counts & start fresh</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <p className="font-semibold">This will immediately delete all existing vehicle records:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>All vehicles ({vehicles.length} units) and movement history</li>
                <li>All manifests, vessel entries, and tracking logs</li>
              </ul>
              <p className="text-amber-700 italic pt-1 border-t border-amber-200/60">
                You can then upload your new manifest file cleanly.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await ApiService.clearAllData(user);
                    showSuccess('All vehicles & manifests deleted. Ready for new upload.');
                    setShowClearModal(false);
                    setVehicles([]);
                    await loadVehicles();
                  } catch (err: any) {
                    showError(err.message || 'Failed to clear data');
                  } finally {
                    setIsClearing(false);
                  }
                }}
                disabled={isClearing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Clearing Records...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Clear All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
