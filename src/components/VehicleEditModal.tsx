import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface VehicleEditModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    serialNumber: number | string;
    chassisNumber: string;
    description: string;
    status: VehicleStatus;
    vesselName?: string;
    voyageNumber?: string;
    notes: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const VehicleEditModal: React.FC<VehicleEditModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [chassisNumber, setChassisNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<VehicleStatus>('AT PORT');
  const [vesselName, setVesselName] = useState<string>('');
  const [voyageNumber, setVoyageNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (vehicle) {
      setSerialNumber(String(vehicle.serialNumber));
      setChassisNumber(vehicle.chassisNumber);
      setDescription(vehicle.description);
      setStatus(vehicle.status);
      setVesselName(vehicle.vesselName || '');
      setVoyageNumber(vehicle.voyageNumber || '');
      setNotes('');
      setError('');
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chassisNumber.trim()) {
      setError('Chassis Number is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!notes.trim()) {
      setError('Please provide an operational authorization reason / note for audit history.');
      return;
    }

    try {
      await onSave({
        serialNumber: isNaN(Number(serialNumber)) ? serialNumber : Number(serialNumber),
        chassisNumber: chassisNumber.trim().toUpperCase(),
        description: description.trim(),
        status,
        vesselName: vesselName.trim().toUpperCase() || undefined,
        voyageNumber: voyageNumber.trim().toUpperCase() || undefined,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update vehicle');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/40 text-blue-300">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Correct / Override Vehicle</h3>
                <p className="text-xs text-slate-300">Admin Authorization Mode</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chassis Number</label>
                <input
                  type="text"
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono font-bold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marine Vessel</label>
                <input
                  type="text"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value.toUpperCase())}
                  placeholder="e.g. MV TRANS CARRIER"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Voyage Number</label>
                <input
                  type="text"
                  value={voyageNumber}
                  onChange={(e) => setVoyageNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. VOY-2026/08"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="AT PORT">AT PORT (Dar es Salaam Port)</option>
                <option value="ON TRANSIT">ON TRANSIT (In transit to E27 yard)</option>
                <option value="RECEIVED AT GALCO">Received (Arrived & Cleared in Yard)</option>
              </select>
              {status !== vehicle.status && (
                <p className="text-[11px] text-amber-600 mt-1 font-medium">
                  Notice: Status will change from <strong>{vehicle.status}</strong> to <strong>{status}</strong>.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorization Justification / Reason (Audit Trail) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Reason for change (e.g. Corrected typo in chassis, manually updated status per gate manifest)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isLoading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
