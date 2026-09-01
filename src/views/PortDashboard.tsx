import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle } from '../types';
import { ApiService } from '../services/api';
import { FirestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from '../components/StatusBadge';
import { ChassisSearchCard } from '../components/ChassisSearchCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Anchor,
  Truck,
  CheckCircle2,
  Search,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Ship,
  Filter,
} from 'lucide-react';

interface PortDashboardProps {
  onViewVehicle: (vehicle: Vehicle) => void;
  activeSubView?: 'dashboard' | 'search' | 'at-port' | 'released';
}

export const PortDashboard: React.FC<PortDashboardProps> = ({
  onViewVehicle,
  activeSubView = 'dashboard',
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [atPortVehicles, setAtPortVehicles] = useState<Vehicle[]>([]);
  const [releasedVehicles, setReleasedVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState<string>('ALL');

  // Quick Release state
  const [selectedToRelease, setSelectedToRelease] = useState<Vehicle | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const isFirstLoad = useRef(true);

  const loadPortData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [portVehs, allVehs] = await Promise.all([
        ApiService.getVehicles({ status: 'AT PORT' }, user),
        ApiService.getVehicles({ status: 'ALL' }, user),
      ]);

      setAtPortVehicles(portVehs);

      // Vehicles that were released by Port officers (status ON TRANSIT or RECEIVED AT GALCO)
      const released = allVehs
        .filter((v) => v.releasedAt !== undefined)
        .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());

      setReleasedVehicles(released);
    } catch (err: any) {
      if (!isBackground) {
        showError(err.message || 'Failed to load port operational data');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadPortData();

    // 1. Live Firestore subscription
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      unsubscribeFirestore = FirestoreService.subscribeVehicles((vehicles) => {
        if (vehicles && vehicles.length > 0) {
          const atPort = vehicles.filter((v) => v.status === 'AT PORT');
          const released = vehicles
            .filter((v) => v.releasedAt !== undefined)
            .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());
          setAtPortVehicles(atPort);
          setReleasedVehicles(released);
          if (isFirstLoad.current) {
            setLoading(false);
            isFirstLoad.current = false;
          }
        }
      });
    } catch (e) {
      console.warn('[PortDashboard] Firestore subscription fallback active', e);
    }

    // 2. High frequency auto-poll (Every 3.5s)
    const interval = setInterval(() => {
      loadPortData(true);
    }, 3500);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
    };
  }, [user]);

  // Unique list of vessels present in port
  const availableVessels = useMemo(() => {
    const set = new Set<string>();
    atPortVehicles.forEach((v) => {
      if (v.vesselName) set.add(v.vesselName);
    });
    releasedVehicles.forEach((v) => {
      if (v.vesselName) set.add(v.vesselName);
    });
    return Array.from(set).sort();
  }, [atPortVehicles, releasedVehicles]);

  const filteredAtPort = useMemo(() => {
    if (selectedVessel === 'ALL') return atPortVehicles;
    return atPortVehicles.filter((v) => v.vesselName === selectedVessel);
  }, [atPortVehicles, selectedVessel]);

  const filteredReleased = useMemo(() => {
    if (selectedVessel === 'ALL') return releasedVehicles;
    return releasedVehicles.filter((v) => v.vesselName === selectedVessel);
  }, [releasedVehicles, selectedVessel]);

  const handleConfirmRelease = async (notes?: string) => {
    if (!selectedToRelease) return;
    setIsActionLoading(true);
    try {
      const updated = await ApiService.releaseVehicle(selectedToRelease.id, notes, user);
      showSuccess(
        `Vehicle ${updated.chassisNumber} (${updated.vesselName || 'Vessel'}) successfully released from Dar es Salaam Port.`
      );
      setSelectedToRelease(null);
      loadPortData();
    } catch (err: any) {
      showError(err.message || 'Release failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Anchor className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Port Release Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Port Release Terminal — Inspect and authorize departure by marine vessel manifest.
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
                <option key={`port-vsl-${vsl}-${idx}`} value={vsl}>
                  {vsl}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadPortData}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Refresh Port Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehicles At Port */}
        <div className="p-5 bg-white rounded-2xl border-2 border-amber-300 bg-amber-50/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
              VEHICLES CURRENTLY AT PORT
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-900 mt-1">
              {filteredAtPort.length}
            </div>
            <p className="text-xs text-amber-700 mt-1 font-medium">
              {selectedVessel !== 'ALL' ? `Ready for release from ${selectedVessel}` : 'Ready for port exit inspection & release'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-md">
            <Anchor className="w-8 h-8" />
          </div>
        </div>

        {/* Recently Released Vehicles */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              TOTAL RELEASED TO ON TRANSIT
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
              {filteredReleased.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {selectedVessel !== 'ALL' ? `Dispatched towards E27 from ${selectedVessel}` : 'Vehicles dispatched towards E27 Yard'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-orange-500 text-white shadow-md">
            <Truck className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Main Focus: Chassis Search Engine */}
      <div>
        <ChassisSearchCard
          onStatusUpdated={loadPortData}
          onViewDetails={onViewVehicle}
          targetRoleFilter="AT PORT"
          autoFocus={true}
        />
      </div>

      {/* Split Lists: Vehicles AT PORT & Recent Released */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Vehicles At Port Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-amber-500/10 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-950">
                At Port ({filteredAtPort.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">TPA Yard Gate Queue</span>
          </div>

          <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-96 flex-1">
            {filteredAtPort.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No vehicles currently waiting at port {selectedVessel !== 'ALL' ? `for ${selectedVessel}` : ''}.
              </div>
            ) : (
              filteredAtPort.map((veh, idx) => (
                <div
                  key={`port-atport-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
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
                      <span>Imported: {new Date(veh.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedToRelease(veh);
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Release</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Recent Released Vehicles */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Recent Port Releases ({filteredReleased.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Departed TPA</span>
          </div>

          <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-96 flex-1">
            {filteredReleased.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No vehicles have been released yet.
              </div>
            ) : (
              filteredReleased.slice(0, 15).map((veh, idx) => (
                <div
                  key={`port-rel-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                  onClick={() => onViewVehicle(veh)}
                  className="py-3 px-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
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
                        Released by {veh.releasedByName || 'Port Officer'} on{' '}
                        {veh.releasedAt ? new Date(veh.releasedAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Release */}
      <ConfirmationModal
        isOpen={!!selectedToRelease}
        type="RELEASE"
        vehicle={selectedToRelease}
        onConfirm={handleConfirmRelease}
        onCancel={() => setSelectedToRelease(null)}
        isLoading={isActionLoading}
      />
    </div>
  );
};
