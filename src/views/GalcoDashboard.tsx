import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from '../components/StatusBadge';
import { ChassisSearchCard } from '../components/ChassisSearchCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Warehouse,
  Truck,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Check,
  Ship,
} from 'lucide-react';

interface GalcoDashboardProps {
  onViewVehicle: (vehicle: Vehicle) => void;
  activeSubView?: 'dashboard' | 'search' | 'on-transit' | 'received';
}

export const GalcoDashboard: React.FC<GalcoDashboardProps> = ({
  onViewVehicle,
  activeSubView = 'dashboard',
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [onTransitVehicles, setOnTransitVehicles] = useState<Vehicle[]>([]);
  const [receivedVehicles, setReceivedVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState<string>('ALL');

  // Quick Receive Modal State
  const [selectedToReceive, setSelectedToReceive] = useState<Vehicle | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadGalcoData = async () => {
    setLoading(true);
    try {
      const [transitVehs, receivedVehs] = await Promise.all([
        ApiService.getVehicles({ status: 'ON TRANSIT' }, user),
        ApiService.getVehicles({ status: 'RECEIVED AT GALCO' }, user),
      ]);

      setOnTransitVehicles(transitVehs);

      // Sort received vehicles by receivedAt descending
      const sortedReceived = receivedVehs.sort(
        (a, b) => new Date(b.receivedAt || b.updatedAt).getTime() - new Date(a.receivedAt || a.updatedAt).getTime()
      );
      setReceivedVehicles(sortedReceived);
    } catch (err: any) {
      showError(err.message || 'Failed to load yard receiving data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGalcoData();
  }, [user]);

  // Unique vessels
  const availableVessels = useMemo(() => {
    const set = new Set<string>();
    onTransitVehicles.forEach((v) => {
      if (v.vesselName) set.add(v.vesselName);
    });
    receivedVehicles.forEach((v) => {
      if (v.vesselName) set.add(v.vesselName);
    });
    return Array.from(set).sort();
  }, [onTransitVehicles, receivedVehicles]);

  const filteredOnTransit = useMemo(() => {
    if (selectedVessel === 'ALL') return onTransitVehicles;
    return onTransitVehicles.filter((v) => v.vesselName === selectedVessel);
  }, [onTransitVehicles, selectedVessel]);

  const filteredReceived = useMemo(() => {
    if (selectedVessel === 'ALL') return receivedVehicles;
    return receivedVehicles.filter((v) => v.vesselName === selectedVessel);
  }, [receivedVehicles, selectedVessel]);

  const handleConfirmReceive = async (notes?: string) => {
    if (!selectedToReceive) return;
    setIsActionLoading(true);
    try {
      const updated = await ApiService.receiveVehicle(selectedToReceive.id, notes, user);
      showSuccess(
        `Vehicle ${updated.chassisNumber} (${updated.vesselName || 'Vessel'}) confirmed and received at E27 Yard.`
      );
      setSelectedToReceive(null);
      loadGalcoData();
    } catch (err: any) {
      showError(err.message || 'Receiving confirmation failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const receivedTodayCount = filteredReceived.filter(
    (v) => v.receivedAt && v.receivedAt.startsWith(todayStr)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Warehouse className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              E27 Yard Receiving
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            E27 Yard — Confirm physical vehicle arrival, gate intake, and vessel manifest reconciliations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Marine Vessel Quick Switcher */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <Ship className="w-4 h-4 text-blue-600" />
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Marine Vessels ({availableVessels.length})</option>
              {availableVessels.map((vsl, idx) => (
                <option key={`galco-vsl-${vsl}-${idx}`} value={vsl}>
                  {vsl}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadGalcoData}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition-colors"
            title="Refresh Yard Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehicles On Transit */}
        <div className="p-5 bg-white rounded-2xl border-2 border-orange-300 bg-orange-50/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-800 block">
              VEHICLES CURRENTLY ON TRANSIT
            </span>
            <div className="text-3xl sm:text-4xl font-black text-orange-900 mt-1">
              {filteredOnTransit.length}
            </div>
            <p className="text-xs text-orange-700 mt-1 font-medium">
              {selectedVessel !== 'ALL' ? `En route to E27 from ${selectedVessel}` : 'En route to E27 Yard'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-orange-500 text-white shadow-md">
            <Truck className="w-8 h-8" />
          </div>
        </div>

        {/* Vehicles Received at E27 */}
        <div className="p-5 bg-white rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              VEHICLES RECEIVED AT E27
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-900 mt-1">
              {filteredReceived.length}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-semibold">
              {receivedTodayCount} received today in yard {selectedVessel !== 'ALL' ? `(${selectedVessel})` : ''}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Main Focus: Chassis Search Engine */}
      <div>
        <ChassisSearchCard
          onStatusUpdated={loadGalcoData}
          onViewDetails={onViewVehicle}
          targetRoleFilter="ON TRANSIT"
          autoFocus={true}
        />
      </div>

      {/* Split Lists: Vehicles ON TRANSIT & Vehicles Received */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Incoming Vehicles On Transit */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-orange-500/10 border-b border-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-700" />
              <h3 className="text-sm font-bold text-orange-950">
                On Transit ({filteredOnTransit.length})
              </h3>
            </div>
          </div>

          <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-96 flex-1">
            {filteredOnTransit.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No vehicles currently on transit {selectedVessel !== 'ALL' ? `for ${selectedVessel}` : ''}.
              </div>
            ) : (
              filteredOnTransit.map((veh, idx) => (
                <div
                  key={`galco-ontransit-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                  onClick={() => onViewVehicle(veh)}
                  className="py-3 px-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{veh.chassisNumber}</span>
                      <span className="text-[11px] text-slate-500">{veh.serialNumber}</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{veh.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                        <Ship className="w-3 h-3" />
                        {veh.vesselName || 'MV TRANS CARRIER'}
                      </span>
                      <span>•</span>
                      <span>
                        Released {veh.releasedAt ? new Date(veh.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} by {veh.releasedByName || 'Port Officer'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedToReceive(veh);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Recently Received in E27 Yard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-emerald-950">
                Received in Yard ({filteredReceived.length})
              </h3>
            </div>
            <span className="text-[11px] text-emerald-800 font-semibold">E27 Depot Storage</span>
          </div>

          <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-96 flex-1">
            {filteredReceived.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No vehicles have been received in the yard yet.
              </div>
            ) : (
              filteredReceived.slice(0, 10).map((veh, idx) => (
                <div
                  key={`galco-recv-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                  onClick={() => onViewVehicle(veh)}
                  className="py-3 px-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{veh.chassisNumber}</span>
                      <span className="text-[11px] text-slate-500">{veh.serialNumber}</span>
                      <StatusBadge status={veh.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 truncate">{veh.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                        <Ship className="w-3 h-3" />
                        {veh.vesselName || 'MV TRANS CARRIER'}
                      </span>
                      <span>•</span>
                      <span>
                        Received by {veh.receivedByName || 'Yard Officer'} on{' '}
                        {veh.receivedAt ? new Date(veh.receivedAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!selectedToReceive}
        type="RECEIVE"
        vehicle={selectedToReceive}
        onConfirm={handleConfirmReceive}
        onCancel={() => setSelectedToReceive(null)}
        isLoading={isActionLoading}
      />
    </div>
  );
};
