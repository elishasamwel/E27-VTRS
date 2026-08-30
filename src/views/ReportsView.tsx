import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from '../components/StatusBadge';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  Clock,
  Car,
  Truck,
  CheckCircle2,
  RefreshCw,
  Ship,
  Anchor,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'ALL'>('ALL');
  const [vesselFilter, setVesselFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getVehicles(
        {
          status: statusFilter,
          vesselName: vesselFilter !== 'ALL' ? vesselFilter : undefined,
        },
        user
      );
      setVehicles(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, vesselFilter, user]);

  // List of distinct vessels
  const availableVessels = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.vesselName) set.add(v.vesselName);
    });
    return Array.from(set).sort();
  }, [vehicles]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const atPort = vehicles.filter((v) => v.status === 'AT PORT').length;
    const onTransit = vehicles.filter((v) => v.status === 'ON TRANSIT').length;
    const received = vehicles.filter((v) => v.status === 'RECEIVED AT GALCO').length;

    // Breakdown by Vessel
    const vesselBreakdown: Record<
      string,
      { total: number; atPort: number; onTransit: number; received: number }
    > = {};

    vehicles.forEach((v) => {
      const vsl = v.vesselName || 'UNKNOWN VESSEL';
      if (!vesselBreakdown[vsl]) {
        vesselBreakdown[vsl] = { total: 0, atPort: 0, onTransit: 0, received: 0 };
      }
      vesselBreakdown[vsl].total++;
      if (v.status === 'AT PORT') vesselBreakdown[vsl].atPort++;
      if (v.status === 'ON TRANSIT') vesselBreakdown[vsl].onTransit++;
      if (v.status === 'RECEIVED AT GALCO') vesselBreakdown[vsl].received++;
    });

    return {
      total,
      atPort,
      onTransit,
      received,
      vesselBreakdown,
    };
  }, [vehicles]);

  // Export Excel
  const handleExportExcel = () => {
    if (vehicles.length === 0) {
      showError('No records to export');
      return;
    }

    const rows = vehicles.map((v) => ({
      'Serial Number': v.serialNumber,
      'Chassis Number': v.chassisNumber,
      Description: v.description,
      'Marine Vessel': v.vesselName || 'MV TRANS CARRIER',
      'Voyage Number': v.voyageNumber || '—',
      Status: v.status,
      'Released By': v.releasedByName || '—',
      'Released Date & Time': v.releasedAt ? new Date(v.releasedAt).toLocaleString() : '—',
      'Received By': v.receivedByName || '—',
      'Received Date & Time': v.receivedAt ? new Date(v.receivedAt).toLocaleString() : '—',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transfer Report');
    const vesselSuffix = vesselFilter !== 'ALL' ? `_${vesselFilter.replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(wb, `E27_Transfer_Report${vesselSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess(`Exported ${rows.length} vehicle report rows to Excel.`);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (vehicles.length === 0) {
      showError('No records to export');
      return;
    }

    const headers = 'Serial Number,Chassis Number,Description,Marine Vessel,Voyage Number,Status,Released By,Release Time,Received By,Received Time\n';
    const rows = vehicles
      .map(
        (v) =>
          `"${v.serialNumber}","${v.chassisNumber}","${v.description.replace(/"/g, '""')}","${
            v.vesselName || ''
          }","${v.voyageNumber || ''}","${v.status}","${v.releasedByName || ''}","${
            v.releasedAt || ''
          }","${v.receivedByName || ''}","${v.receivedAt || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const vesselSuffix = vesselFilter !== 'ALL' ? `_${vesselFilter.replace(/\s+/g, '_')}` : '';
    link.download = `E27_Transfer_Report${vesselSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showSuccess('Exported vehicle report to CSV.');
  };

  // Export PDF
  const handleExportPdf = () => {
    if (vehicles.length === 0) {
      showError('No records to export');
      return;
    }

    const doc = new jsPDF('landscape');

    // Title Header
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('E27 VTMS — VEHICLE TRANSFER REPORT', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated on: ${new Date().toLocaleString()} | Status: ${statusFilter} | Vessel: ${vesselFilter} | Total Records: ${
        vehicles.length
      }`,
      14,
      25
    );

    const tableHeaders = [
      ['S/N', 'Chassis Number', 'Description', 'Marine Vessel', 'Status', 'Port Release Log', 'E27 Yard Receipt'],
    ];

    const tableData = vehicles.map((v) => [
      String(v.serialNumber),
      v.chassisNumber,
      v.description,
      `${v.vesselName || 'MV TRANS CARRIER'}${v.voyageNumber ? `\n(${v.voyageNumber})` : ''}`,
      v.status,
      v.releasedAt
        ? `${v.releasedByName || 'Port Officer'}\n${new Date(v.releasedAt).toLocaleDateString()}`
        : '—',
      v.receivedAt
        ? `${v.receivedByName || 'E27 Officer'}\n${new Date(v.receivedAt).toLocaleDateString()}`
        : '—',
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    const vesselSuffix = vesselFilter !== 'ALL' ? `_${vesselFilter.replace(/\s+/g, '_')}` : '';
    doc.save(`E27_Transfer_Report${vesselSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess('Generated official PDF transfer report.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Reports
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Metrics Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block">TOTAL VEHICLES</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-xs font-bold uppercase text-amber-800 block">Port</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{metrics.atPort}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-orange-200 bg-orange-50/20 shadow-xs">
          <span className="text-xs font-bold uppercase text-orange-800 block">On Transit</span>
          <div className="text-2xl font-black text-orange-900 mt-1">{metrics.onTransit}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-bold uppercase text-emerald-800 block">Received</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{metrics.received}</div>
        </div>
      </div>

      {/* Per Vessel Manifest Reconciliation Summary */}
      {Object.keys(metrics.vesselBreakdown).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Ship className="w-4 h-4 text-blue-600" /> Marine Vessel Manifest Reconciliation Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              Object.entries(metrics.vesselBreakdown) as [
                string,
                { total: number; atPort: number; onTransit: number; received: number }
              ][]
            ).map(([vslName, vslStats]) => (
              <div
                key={vslName}
                onClick={() => setVesselFilter(vslName === vesselFilter ? 'ALL' : vslName)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  vesselFilter === vslName
                    ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900 text-sm mb-2">
                  <span className="truncate">{vslName}</span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    {vslStats.total} cars
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
                  <div className="p-1.5 rounded-lg bg-amber-100/60 text-amber-900">
                    <span className="block font-bold">{vslStats.atPort}</span>
                    <span className="text-[10px] text-amber-700">Port</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-orange-100/60 text-orange-900">
                    <span className="block font-bold">{vslStats.onTransit}</span>
                    <span className="text-[10px] text-orange-700">Transit</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-100/60 text-emerald-900">
                    <span className="block font-bold">{vslStats.received}</span>
                    <span className="text-[10px] text-emerald-700">Received</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Parameters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
          <div className="inline-flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'AT PORT', label: 'Port' },
              { id: 'ON TRANSIT', label: 'On Transit' },
              { id: 'RECEIVED AT GALCO', label: 'Received' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Marine Vessel Filter & Reset */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Ship className="w-3.5 h-3.5 text-blue-600" /> Vessel:
            </span>
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none"
            >
              <option value="ALL">All Vessels</option>
              {availableVessels.map((vsl) => (
                <option key={vsl} value={vsl}>
                  {vsl}
                </option>
              ))}
              {availableVessels.length === 0 && (
                <>
                  <option value="MV TRANS CARRIER">MV TRANS CARRIER</option>
                  <option value="MV PACIFIC GLORY">MV PACIFIC GLORY</option>
                </>
              )}
            </select>
          </div>

          {(vesselFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setVesselFilter('ALL');
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Report Data ({vehicles.length} Records)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">S/N</th>
                <th className="py-3 px-4">Chassis Number</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Marine Vessel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Port Release Log</th>
                <th className="py-3 px-4">E27 Yard Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading report rows...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No vehicles found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-600">{v.serialNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.chassisNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{v.description}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-semibold text-[11px]">
                        <Ship className="w-3 h-3 text-blue-600" />
                        {v.vesselName || 'MV TRANS CARRIER'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {v.releasedAt ? (
                        <div>
                          <div className="font-semibold text-slate-800">{v.releasedByName || 'Port Officer'}</div>
                          <div className="text-[11px] text-slate-400">{new Date(v.releasedAt).toLocaleString()}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {v.receivedAt ? (
                        <div>
                          <div className="font-semibold text-slate-800">{v.receivedByName || 'E27 Officer'}</div>
                          <div className="text-[11px] text-slate-400">{new Date(v.receivedAt).toLocaleString()}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
