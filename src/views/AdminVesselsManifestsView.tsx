import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { MarineVessel, Manifest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ship,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Edit2,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  Check,
  RefreshCw,
} from 'lucide-react';

interface AdminVesselsManifestsViewProps {
  onNavigateToVehicles?: (vesselName?: string) => void;
  onOpenUploadModal?: () => void;
}

export const AdminVesselsManifestsView: React.FC<AdminVesselsManifestsViewProps> = ({
  onNavigateToVehicles,
  onOpenUploadModal,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState<'vessels' | 'manifests'>('vessels');
  const [vessels, setVessels] = useState<MarineVessel[]>([]);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Vessel filtering
  const [vesselFilter, setVesselFilter] = useState<'ALL' | 'OPERATIONAL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manifest deletion state
  const [manifestToDelete, setManifestToDelete] = useState<Manifest | null>(null);
  const [isDeletingManifest, setIsDeletingManifest] = useState<boolean>(false);

  // Vessel deletion state
  const [vesselToDelete, setVesselToDelete] = useState<MarineVessel | null>(null);
  const [isDeletingVessel, setIsDeletingVessel] = useState<boolean>(false);

  // Vessel Edit Modal
  const [isVesselModalOpen, setIsVesselModalOpen] = useState<boolean>(false);
  const [editingVessel, setEditingVessel] = useState<MarineVessel | null>(null);
  const [vesselFormName, setVesselFormName] = useState<string>('');
  const [vesselFormVoyage, setVesselFormVoyage] = useState<string>('');
  const [vesselFormPort, setVesselFormPort] = useState<string>('Dar es Salaam Port (TPA)');
  const [vesselFormNotes, setVesselFormNotes] = useState<string>('');
  const [vesselFormVisible, setVesselFormVisible] = useState<boolean>(true);
  const [isSavingVessel, setIsSavingVessel] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vesselsData, manifestsData] = await Promise.all([
        ApiService.getVessels(false, user),
        ApiService.getManifests(user),
      ]);
      // Exclude any vessel named 'e27' or 'E27' if it existed
      const cleanedVessels = vesselsData.filter(
        (v) => v.name.trim().toUpperCase() !== 'E27' && v.id.toLowerCase() !== 'e27'
      );
      setVessels(cleanedVessels);
      setManifests(manifestsData);
    } catch (err: any) {
      showError(err.message || 'Failed to load vessels and manifests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle single vessel visibility in operations
  const handleToggleVisibility = async (vessel: MarineVessel) => {
    const newVisibility = !vessel.isVisibleInOperations;
    try {
      await ApiService.updateVessel(
        vessel.id,
        { isVisibleInOperations: newVisibility },
        user
      );
      setVessels((prev) =>
        prev.map((v) => (v.id === vessel.id ? { ...v, isVisibleInOperations: newVisibility } : v))
      );
      showSuccess(
        newVisibility
          ? `Vessel "${vessel.name}" is now displayed in daily operations.`
          : `Vessel "${vessel.name}" is now hidden from daily operations.`
      );
    } catch (err: any) {
      showError(err.message || 'Failed to update visibility');
    }
  };

  // Mark vessel completed vs active
  const handleToggleStatus = async (vessel: MarineVessel) => {
    const newStatus = vessel.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED';
    const newVisibility = newStatus === 'ACTIVE'; // Auto show if reactivated
    try {
      await ApiService.updateVessel(
        vessel.id,
        { status: newStatus, isVisibleInOperations: newVisibility },
        user
      );
      setVessels((prev) =>
        prev.map((v) =>
          v.id === vessel.id ? { ...v, status: newStatus, isVisibleInOperations: newVisibility } : v
        )
      );
      showSuccess(
        newStatus === 'COMPLETED'
          ? `Vessel "${vessel.name}" marked as Transfer Completed.`
          : `Vessel "${vessel.name}" reactivated for operations.`
      );
    } catch (err: any) {
      showError(err.message || 'Failed to update vessel status');
    }
  };

  // Delete manifest batch
  const handleConfirmDeleteManifest = async () => {
    if (!manifestToDelete) return;
    setIsDeletingManifest(true);
    try {
      const result = await ApiService.deleteManifest(manifestToDelete.id, user);
      showSuccess(
        `Manifest "${manifestToDelete.fileName}" deleted. ${result.removedCount} associated vehicles were successfully rolled back.`
      );
      setManifestToDelete(null);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete manifest');
    } finally {
      setIsDeletingManifest(false);
    }
  };

  // Delete individual vessel record
  const handleConfirmDeleteVessel = async () => {
    if (!vesselToDelete) return;
    setIsDeletingVessel(true);
    try {
      await ApiService.deleteVessel(vesselToDelete.id, user);
      showSuccess(`Marine Vessel "${vesselToDelete.name}" was removed.`);
      setVesselToDelete(null);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete vessel');
    } finally {
      setIsDeletingVessel(false);
    }
  };

  // Open Edit Vessel Modal
  const handleOpenEditVessel = (v: MarineVessel) => {
    setEditingVessel(v);
    setVesselFormName(v.name);
    setVesselFormVoyage(v.voyageNumber || '');
    setVesselFormPort(v.portOfDischarge || 'Dar es Salaam Port (TPA)');
    setVesselFormNotes(v.notes || '');
    setVesselFormVisible(v.isVisibleInOperations);
    setIsVesselModalOpen(true);
  };

  // Save Vessel
  const handleSaveVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselFormName.trim()) {
      showError('Please enter a valid Marine Vessel name.');
      return;
    }

    setIsSavingVessel(true);
    try {
      if (editingVessel) {
        await ApiService.updateVessel(
          editingVessel.id,
          {
            name: vesselFormName.trim().toUpperCase(),
            voyageNumber: vesselFormVoyage.trim(),
            portOfDischarge: vesselFormPort.trim(),
            notes: vesselFormNotes.trim(),
            isVisibleInOperations: vesselFormVisible,
          },
          user
        );
        showSuccess(`Marine Vessel "${vesselFormName.toUpperCase()}" updated successfully.`);
      }
      setIsVesselModalOpen(false);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save vessel');
    } finally {
      setIsSavingVessel(false);
    }
  };

  // Filtered vessels
  const filteredVessels = vessels.filter((v) => {
    if (vesselFilter === 'OPERATIONAL' && !v.isVisibleInOperations) return false;
    if (vesselFilter === 'ACTIVE' && v.status !== 'ACTIVE') return false;
    if (vesselFilter === 'COMPLETED' && v.status !== 'COMPLETED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchVoyage = v.voyageNumber?.toLowerCase().includes(q);
      return matchName || matchVoyage;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl border border-blue-200">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Marine Vessels & Manifest Control
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational vessel display, archive finished transfers, and handle uploaded manifests.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenUploadModal && onOpenUploadModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Manifest</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('vessels')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 relative transition-colors ${
            activeTab === 'vessels'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Operational Marine Vessels</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-bold">
            {vessels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('manifests')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 relative transition-colors ${
            activeTab === 'manifests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Uploaded Manifests & Rollback</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-bold">
            {manifests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: MARINE VESSELS MANAGEMENT */}
      {activeTab === 'vessels' && (
        <div className="space-y-5">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setVesselFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vesselFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({vessels.length})
              </button>
              <button
                onClick={() => setVesselFilter('OPERATIONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vesselFilter === 'OPERATIONAL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                In Operations ({vessels.filter((v) => v.isVisibleInOperations).length})
              </button>
              <button
                onClick={() => setVesselFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vesselFilter === 'ACTIVE'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Active ({vessels.filter((v) => v.status === 'ACTIVE').length})
              </button>
              <button
                onClick={() => setVesselFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  vesselFilter === 'COMPLETED'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                Completed ({vessels.filter((v) => v.status === 'COMPLETED').length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vessel name or voyage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Vessels Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p>Loading marine vessels registry...</p>
            </div>
          ) : filteredVessels.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
              <Ship className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No marine vessels found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload a manifest to register a marine vessel into the system.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVessels.map((vessel) => (
                <div
                  key={vessel.id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                    vessel.isVisibleInOperations
                      ? 'border-blue-200 hover:border-blue-300'
                      : 'border-slate-200 bg-slate-50/50 opacity-90'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{vessel.name}</h3>
                        {vessel.status === 'COMPLETED' ? (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Transfer Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active Operation
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Voyage: <strong className="text-slate-700">{vessel.voyageNumber || 'N/A'}</strong> | Port: {vessel.portOfDischarge || 'Dar es Salaam'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditVessel(vessel)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Vessel Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setVesselToDelete(vessel)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Vessel Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Transfer Pipeline Metrics */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-600">Transfer Progress</span>
                      <span className="font-bold text-blue-700">{vessel.completionRate || 0}% Complete</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2.5">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${vessel.completionRate || 0}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-medium">TOTAL</span>
                        <strong className="text-slate-800 text-xs font-bold">{vessel.totalVehicles || 0}</strong>
                      </div>
                      <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                        <span className="text-[10px] text-amber-700 block font-medium">AT PORT</span>
                        <strong className="text-amber-900 text-xs font-bold">{vessel.atPortCount || 0}</strong>
                      </div>
                      <div className="p-1.5 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-[10px] text-orange-700 block font-medium">TRANSIT</span>
                        <strong className="text-orange-900 text-xs font-bold">{vessel.onTransitCount || 0}</strong>
                      </div>
                      <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 block font-medium">RECEIVED</span>
                        <strong className="text-emerald-900 text-xs font-bold">{vessel.receivedCount || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Operational Visibility Toggle Control */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 border border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      {vessel.isVisibleInOperations ? (
                        <Eye className="w-4 h-4 text-blue-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Display in Operations
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {vessel.isVisibleInOperations
                            ? 'Visible in active Port Release & Receiving lists'
                            : 'Hidden from active operational lists'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleVisibility(vessel)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        vessel.isVisibleInOperations ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          vessel.isVisibleInOperations ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleToggleStatus(vessel)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        vessel.status === 'COMPLETED'
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {vessel.status === 'COMPLETED' ? 'Reactivate Operation' : 'Mark Finished'}
                    </button>

                    {onNavigateToVehicles && (
                      <button
                        onClick={() => onNavigateToVehicles(vessel.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        <span>View Vehicles ({vessel.totalVehicles || 0})</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOADED MANIFESTS & BATCH ROLLBACK */}
      {activeTab === 'manifests' && (
        <div className="space-y-5">
          {/* Manifests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Manifest Intake Records</h3>
                <p className="text-xs text-slate-500">
                  Total {manifests.length} manifest files logged in system
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p>Loading manifest intake logs...</p>
              </div>
            ) : manifests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No manifests uploaded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Manifest File Name</th>
                      <th className="py-3 px-4">Marine Vessel</th>
                      <th className="py-3 px-4">Voyage / Port</th>
                      <th className="py-3 px-4">Upload Timestamp</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4 text-center">Vehicles Imported</th>
                      <th className="py-3 px-4 text-right">Batch Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifests.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate max-w-xs">{m.fileName}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {m.vesselName || 'GENERAL INTAKE'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{m.voyageNumber || 'N/A'}</div>
                          <div className="text-[11px] text-slate-400">{m.portOfDischarge || 'Dar es Salaam'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(m.uploadedAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {m.uploadedByName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            {m.successfulRecords} / {m.totalRecords}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setManifestToDelete(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
                            title="Delete this manifest and rollback all imported vehicles"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Manifest</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM MANIFEST DELETION MODAL */}
      <AnimatePresence>
        {manifestToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 bg-rose-600 text-white flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Confirm Manifest Deletion & Rollback</h3>
                  <p className="text-xs text-rose-100">Permanent batch deletion operation</p>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-700">
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                  <div className="font-bold text-rose-950 text-sm">
                    {manifestToDelete.fileName}
                  </div>
                  <div className="text-rose-800">
                    Vessel: <strong>{manifestToDelete.vesselName}</strong> ({manifestToDelete.voyageNumber || 'N/A'})
                  </div>
                  <div className="text-rose-700">
                    Uploaded: {new Date(manifestToDelete.uploadedAt).toLocaleString()} by {manifestToDelete.uploadedByName}
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 font-bold block">
                    Rollback Details:
                  </strong>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>
                      All <strong>{manifestToDelete.successfulRecords} vehicles</strong> imported in this manifest file will be removed.
                    </li>
                    <li>
                      Any associated status change history for these vehicles will be rolled back.
                    </li>
                  </ul>
                </div>

                <p className="text-rose-600 font-semibold text-center">
                  Are you sure you want to proceed with this rollback?
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setManifestToDelete(null)}
                  disabled={isDeletingManifest}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteManifest}
                  disabled={isDeletingManifest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all disabled:opacity-50"
                >
                  {isDeletingManifest ? (
                    <span>Rolling back manifest...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete & Rollback Vehicles</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM VESSEL DELETION MODAL */}
      <AnimatePresence>
        {vesselToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 bg-rose-600 text-white flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Delete Marine Vessel</h3>
                  <p className="text-xs text-rose-100">Remove vessel from system registry</p>
                </div>
              </div>

              <div className="p-6 space-y-3 text-xs text-slate-700">
                <p>
                  Are you sure you want to delete the marine vessel <strong>{vesselToDelete.name}</strong>?
                </p>
                <p className="text-slate-500">
                  Historical vehicle transfer records will remain in the database.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVesselToDelete(null)}
                  disabled={isDeletingVessel}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteVessel}
                  disabled={isDeletingVessel}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isDeletingVessel ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VESSEL MODAL */}
      <AnimatePresence>
        {isVesselModalOpen && editingVessel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <form onSubmit={handleSaveVessel}>
                <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Ship className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold">
                      Edit Marine Vessel
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVesselModalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Marine Vessel Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MV TRANS CARRIER"
                      value={vesselFormName}
                      onChange={(e) => setVesselFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Voyage Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VOY-2026/08"
                        value={vesselFormVoyage}
                        onChange={(e) => setVesselFormVoyage(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Port of Discharge
                      </label>
                      <input
                        type="text"
                        value={vesselFormPort}
                        onChange={(e) => setVesselFormPort(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Operational Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes or ETA details..."
                      value={vesselFormNotes}
                      onChange={(e) => setVesselFormNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800 block">Display in Operations</span>
                      <span className="text-[11px] text-slate-500">Show in Port and Yard receiving selection</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={vesselFormVisible}
                      onChange={(e) => setVesselFormVisible(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVesselModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingVessel}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSavingVessel ? 'Saving...' : 'Update Vessel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
