import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ApiService } from '../services/api';
import { Search, Truck, CheckCircle, AlertCircle, ArrowRight, ShieldAlert, Ship } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChassisSearchCardProps {
  onStatusUpdated?: () => void;
  onViewDetails?: (vehicle: Vehicle) => void;
  targetRoleFilter?: VehicleStatus;
  autoFocus?: boolean;
}

export const ChassisSearchCard: React.FC<ChassisSearchCardProps> = ({
  onStatusUpdated,
  onViewDetails,
  targetRoleFilter,
  autoFocus = true,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Confirmation Modal State
  const [confirmType, setConfirmType] = useState<'RELEASE' | 'RECEIVE' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleSearch = async (searchVal: string) => {
    const q = searchVal.trim();
    if (!q) {
      setResults([]);
      setSelectedVehicle(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Fetch matching vehicles
      const matches = await ApiService.searchChassis(q, undefined, user);
      setResults(matches);

      if (matches.length === 1) {
        setSelectedVehicle(matches[0]);
      } else if (matches.length === 0) {
        setSelectedVehicle(null);
      } else {
        // multiple matches - keep current selected if still in matches, or reset
        setSelectedVehicle((prev) => (prev && matches.some((m) => m.id === prev.id) ? prev : null));
      }
    } catch (err: any) {
      showError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    handleSearch(val);
  };

  const handleConfirmAction = async (notes?: string) => {
    if (!selectedVehicle || !confirmType) return;
    setIsActionLoading(true);

    try {
      if (confirmType === 'RELEASE') {
        const updated = await ApiService.releaseVehicle(selectedVehicle.id, notes, user);
        showSuccess(`Vehicle ${updated.chassisNumber} successfully released from port (Now ON TRANSIT).`);
        setSelectedVehicle(updated);
        // update item in search results
        setResults((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else if (confirmType === 'RECEIVE') {
        const updated = await ApiService.receiveVehicle(selectedVehicle.id, notes, user);
        showSuccess(`Vehicle ${updated.chassisNumber} successfully received at E27 Yard.`);
        setSelectedVehicle(updated);
        setResults((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      }

      setConfirmType(null);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      showError(err.message || 'Operation failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Search Bar Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Search Vehicle by Chassis Number
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Enter the last 5 characters/digits of the chassis number (or full chassis).
          </p>
        </div>

        {/* Large Prominent Input */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-6 h-6 text-blue-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            autoFocus={autoFocus}
            placeholder="enter last 5 digits or full chassis number..."
            className="w-full pl-13 pr-28 py-3.5 sm:py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base font-mono text-base sm:text-lg font-bold tracking-wider uppercase focus:outline-none focus:border-blue-400 focus:bg-white/15 focus:ring-4 focus:ring-blue-500/20 transition-all backdrop-blur-md"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setSelectedVehicle(null);
                setHasSearched(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results & Actions Area */}
      <div className="p-6">
        {isSearching && (
          <div className="py-8 text-center text-slate-500 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full mb-2" />
            <p>Searching chassis records...</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="py-10 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No vehicle found with this chassis number.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Verify the entered characters or ensure the vehicle has been imported via an official manifest.
            </p>
          </div>
        )}

        {/* Multiple Matches Disambiguation List */}
        {!isSearching && results.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Multiple Matching Vehicles Found ({results.length}) — Please Select:
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                Select the exact full chassis
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((veh, idx) => {
                const isSelected = selectedVehicle?.id === veh.id;
                return (
                  <button
                    key={`search-res-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                    onClick={() => setSelectedVehicle(veh)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {veh.chassisNumber}
                      </span>
                      <StatusBadge status={veh.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 truncate">{veh.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Serial: {veh.serialNumber}</span>
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                        <Ship className="w-3 h-3" />
                        {veh.vesselName || 'MV TRANS CARRIER'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Highlighted Vehicle Detail Card (Section 23) */}
        {!isSearching && selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Vehicle Found
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-mono font-black tracking-tight text-slate-900">
                    {selectedVehicle.chassisNumber}
                  </h3>
                  <StatusBadge status={selectedVehicle.status} size="lg" />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs">
                    <Ship className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedVehicle.vesselName || 'MV TRANS CARRIER'}</span>
                    {selectedVehicle.voyageNumber && (
                      <span className="text-blue-600 font-normal">({selectedVehicle.voyageNumber})</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-xs text-slate-500 block">Serial Number</span>
                <span className="text-lg font-bold text-slate-800">{selectedVehicle.serialNumber}</span>
              </div>
            </div>

            {/* Key Specs Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Vehicle Description</span>
                <span className="font-semibold text-slate-900 text-base">{selectedVehicle.description}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Origin Marine Vessel</span>
                <span className="font-semibold text-blue-900 flex items-center gap-1">
                  <Ship className="w-4 h-4 text-blue-600" />
                  {selectedVehicle.vesselName || 'MV TRANS CARRIER'}
                </span>
                {selectedVehicle.voyageNumber && (
                  <span className="text-[11px] text-slate-500 block font-mono">
                    Voyage: {selectedVehicle.voyageNumber}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Current Location</span>
                <span className="font-semibold text-slate-800">
                  {selectedVehicle.status === 'AT PORT' && 'Dar es Salaam Port (TPA)'}
                  {selectedVehicle.status === 'ON TRANSIT' && 'In Transit to Yard'}
                  {selectedVehicle.status === 'RECEIVED AT GALCO' && 'E27 Yard'}
                </span>
              </div>
            </div>

            {/* Transfer State Meta details */}
            {selectedVehicle.releasedAt && (
              <div className="text-xs text-slate-600 bg-orange-50/60 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                <span>
                  Released by: <strong>{selectedVehicle.releasedByName || 'Port Officer'}</strong>
                </span>
                <span>{new Date(selectedVehicle.releasedAt).toLocaleString()}</span>
              </div>
            )}
            {selectedVehicle.receivedAt && (
              <div className="text-xs text-slate-600 bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                <span>
                  Received by: <strong>{selectedVehicle.receivedByName || 'E27 Officer'}</strong>
                </span>
                <span>{new Date(selectedVehicle.receivedAt).toLocaleString()}</span>
              </div>
            )}

            {/* Operational Action Buttons based on Role & Status */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                {onViewDetails && (
                  <button
                    type="button"
                    onClick={() => onViewDetails(selectedVehicle)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span>View Full Profile & Timeline</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {/* 1. Port User Action (or Admin) */}
                {(user?.role === 'PORT_RELEASE' || user?.role === 'ADMIN') && (
                  <>
                    {selectedVehicle.status === 'AT PORT' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmType('RELEASE')}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-orange-200"
                      >
                        <Truck className="w-5 h-5" />
                        <span>RELEASE FROM PORT</span>
                      </button>
                    ) : user?.role === 'PORT_RELEASE' ? (
                      <div className="text-xs font-medium text-slate-500 bg-slate-200/80 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-slate-500" />
                        <span>
                          {selectedVehicle.status === 'ON TRANSIT'
                            ? 'Vehicle has already departed port (On Transit)'
                            : 'Vehicle already received at E27'}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}

                {/* 2. E27 Receiving User Action (or Admin) */}
                {(user?.role === 'GALCO_RECEIVING' || user?.role === 'ADMIN') && (
                  <>
                    {selectedVehicle.status === 'ON TRANSIT' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmType('RECEIVE')}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-emerald-200"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>RECEIVE AT E27</span>
                      </button>
                    ) : user?.role === 'GALCO_RECEIVING' ? (
                      <div className="text-xs font-medium text-slate-500 bg-slate-200/80 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-slate-500" />
                        <span>
                          {selectedVehicle.status === 'AT PORT'
                            ? 'Cannot receive: Vehicle is still AT PORT'
                            : 'Vehicle is already received at E27 yard'}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={!!confirmType}
        type={confirmType || 'RELEASE'}
        vehicle={selectedVehicle}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmType(null)}
        isLoading={isActionLoading}
      />
    </div>
  );
};
