import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, X, Truck, Anchor, Ship } from 'lucide-react';
import { Vehicle } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: 'RELEASE' | 'RECEIVE' | 'DELETE' | 'OVERRIDE';
  vehicle: Vehicle | null;
  onConfirm: (notes?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  vehicle,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !vehicle) return null;

  const isRelease = type === 'RELEASE';
  const isReceive = type === 'RECEIVE';
  const isDelete = type === 'DELETE';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div
            className={`p-5 flex items-center justify-between border-b ${
              isRelease
                ? 'bg-orange-50/80 border-orange-100'
                : isReceive
                ? 'bg-emerald-50/80 border-emerald-100'
                : isDelete
                ? 'bg-rose-50/80 border-rose-100'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isRelease
                    ? 'bg-orange-600 text-white'
                    : isReceive
                    ? 'bg-emerald-600 text-white'
                    : isDelete
                    ? 'bg-rose-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isRelease && <Truck className="w-5 h-5" />}
                {isReceive && <CheckCircle className="w-5 h-5" />}
                {isDelete && <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRelease && 'Confirm Departure from Port'}
                  {isReceive && 'Confirm Receipt at E27'}
                  {isDelete && 'Delete Vehicle Record'}
                  {type === 'OVERRIDE' && 'Confirm Status Override'}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {isRelease && 'DAR ES SALAAM PORT (TPA) → ON TRANSIT'}
                  {isReceive && 'ON TRANSIT → E27 YARD'}
                  {isDelete && 'Permanent deletion from database'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="text-sm text-slate-700 leading-relaxed">
              {isRelease && 'Are you sure this vehicle has departed from the port?'}
              {isReceive && 'Confirm that this vehicle has physically arrived at E27?'}
              {isDelete && 'Are you sure you want to permanently delete this vehicle from the system? This action cannot be undone.'}
            </div>

            {/* Vehicle Summary Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-blue-700">
                  <Ship className="w-3.5 h-3.5" />
                  {vehicle.vesselName || 'MV TRANS CARRIER'} {vehicle.voyageNumber ? `(${vehicle.voyageNumber})` : ''}
                </span>
                <span className="text-slate-700 font-bold">Serial: {vehicle.serialNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Chassis Number</span>
                  <span className="font-mono font-bold text-slate-900 text-base tracking-tight">
                    {vehicle.chassisNumber}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Current Status</span>
                  <span className="font-medium text-slate-800">{vehicle.status}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Description</span>
                <span className="font-medium text-slate-800">{vehicle.description}</span>
              </div>
            </div>

            {/* Optional Notes */}
            {!isDelete && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isRelease
                      ? 'e.g., Driver Name, Carrier Truck Reg #, Gate 4'
                      : 'e.g., Parked at Yard Bay B-07, Exterior checked'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(notes)}
              disabled={isLoading}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-all shadow-md flex items-center gap-2 ${
                isRelease
                  ? 'bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-500'
                  : isReceive
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500'
                  : isDelete
                  ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : isRelease ? (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Confirm Release</span>
                </>
              ) : isReceive ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Receipt</span>
                </>
              ) : isDelete ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Delete Vehicle</span>
                </>
              ) : (
                <span>Confirm</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
