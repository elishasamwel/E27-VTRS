import React, { useEffect, useState } from 'react';
import { Vehicle, VehicleHistoryItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { VehicleTimeline } from './VehicleTimeline';
import { ConfirmationModal } from './ConfirmationModal';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { X, Car, Calendar, User, Clock, FileText, ExternalLink, ShieldCheck, Ship, Anchor, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VehicleDetailModalProps {
  vehicleId?: string | null;
  vehicle?: Vehicle | null;
  isOpen?: boolean;
  onClose: () => void;
  onEdit?: (vehicle: Vehicle) => void;
  onStatusUpdated?: () => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicleId,
  vehicle: initialVehicle,
  isOpen = true,
  onClose,
  onEdit,
  onStatusUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [vehicle, setVehicle] = useState<Vehicle | null>(initialVehicle || null);
  const [history, setHistory] = useState<VehicleHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'timeline'>('profile');
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isUndoLoading, setIsUndoLoading] = useState(false);

  const effectiveId = vehicleId || initialVehicle?.id;

  const loadDetails = () => {
    if (!effectiveId) {
      if (initialVehicle) setVehicle(initialVehicle);
      return;
    }

    setLoading(true);
    ApiService.getVehicleDetails(effectiveId, user)
      .then((data) => {
        setVehicle(data.vehicle);
        setHistory(data.history || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && (effectiveId || initialVehicle)) {
      loadDetails();
    } else {
      setVehicle(null);
      setHistory([]);
    }
  }, [effectiveId, initialVehicle, isOpen, user]);

  const handleConfirmUndoRelease = async (reason?: string) => {
    if (!vehicle) return;
    setIsUndoLoading(true);
    try {
      const updated = await ApiService.undoPortRelease(vehicle.id, reason, user);
      showSuccess(
        `Vehicle ${updated.chassisNumber} port release undone. Status returned to AT PORT.`
      );
      setVehicle(updated);
      setIsUndoModalOpen(false);
      loadDetails();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to undo port release');
    } finally {
      setIsUndoLoading(false);
    }
  };

  if (!isOpen || (!effectiveId && !initialVehicle)) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/30">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold tracking-tight text-white font-mono">
                    {vehicle?.chassisNumber || 'Loading Vehicle...'}
                  </h3>
                  {vehicle && <StatusBadge status={vehicle.status} size="sm" />}
                </div>
                <p className="text-xs text-slate-300">
                  {vehicle?.description || 'E27 Tracked Vehicle Profile'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Vehicle Information & Transfers
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Movement Timeline & Logs
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {loading && !vehicle ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" />
                <p>Loading vehicle profile & transfer history...</p>
              </div>
            ) : !vehicle ? (
              <div className="py-12 text-center text-slate-500 text-sm">Vehicle details not found.</div>
            ) : activeTab === 'profile' ? (
              <div className="space-y-6">
                {/* 1. Vehicle Information */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 block">Serial Number</span>
                      <span className="text-base font-bold text-slate-900">{vehicle.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Chassis Number</span>
                      <span className="text-base font-mono font-bold text-blue-700">{vehicle.chassisNumber}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-500 block">Description / Model</span>
                      <span className="text-sm font-semibold text-slate-800">{vehicle.description}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Marine Vessel</span>
                      <span className="text-sm font-bold text-blue-900 flex items-center gap-1 mt-0.5">
                        <Ship className="w-3.5 h-3.5 text-blue-600" />
                        {vehicle.vesselName || 'MV TRANS CARRIER'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Voyage Number / Port</span>
                      <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Anchor className="w-3.5 h-3.5 text-slate-500" />
                        {vehicle.voyageNumber || 'V.2026-01'} ({vehicle.portOfDischarge || 'Dar es Salaam'})
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Current Status</span>
                      <div className="mt-1">
                        <StatusBadge status={vehicle.status} size="md" />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Imported Into System</span>
                      <span className="text-xs font-medium text-slate-700">
                        {new Date(vehicle.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Port Release Information */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Port Release Information (TPA)
                    </h4>
                    {user?.role === 'ADMIN' && vehicle.status === 'ON TRANSIT' && (
                      <button
                        type="button"
                        onClick={() => setIsUndoModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Undo Port Release (Admin)</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`p-4 rounded-xl border ${
                      vehicle.releasedAt
                        ? 'bg-orange-50/60 border-orange-200'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {vehicle.releasedAt ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-slate-500 block">Released By Officer</span>
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <User className="w-3.5 h-3.5 text-orange-600" />
                              {vehicle.releasedByName || 'Port Release Officer'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block">Release Date & Time</span>
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-orange-600" />
                              {new Date(vehicle.releasedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {vehicle.releaseNotes && (
                          <div className="pt-2 border-t border-orange-200 text-xs text-orange-950">
                            <span className="font-semibold">Release Notes:</span> {vehicle.releaseNotes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-1">
                        Vehicle is currently at Dar es Salaam Port (TPA) and has not yet departed.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. E27 Receiving Information */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    E27 Receiving Information
                  </h4>
                  <div
                    className={`p-4 rounded-xl border ${
                      vehicle.receivedAt
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {vehicle.receivedAt ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 block">Received By Officer</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            {vehicle.receivedByName || 'E27 Yard Officer'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Received Date & Time</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            {new Date(vehicle.receivedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-1">
                        Vehicle has not yet been received at E27 yard.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <VehicleTimeline vehicle={vehicle} history={history} />
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Chassis ID: <span className="font-mono font-medium text-slate-700">{vehicle?.id}</span>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'ADMIN' && vehicle?.status === 'ON TRANSIT' && (
                <button
                  type="button"
                  onClick={() => setIsUndoModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Undo Port Release</span>
                </button>
              )}
              {user?.role === 'ADMIN' && onEdit && vehicle && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(vehicle);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Edit / Override Record
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal for Undo Release */}
      <ConfirmationModal
        isOpen={isUndoModalOpen}
        type="UNDO_RELEASE"
        vehicle={vehicle}
        onConfirm={handleConfirmUndoRelease}
        onCancel={() => setIsUndoModalOpen(false)}
        isLoading={isUndoLoading}
      />
    </AnimatePresence>
  );
};
