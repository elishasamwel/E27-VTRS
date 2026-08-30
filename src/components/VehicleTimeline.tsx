import React from 'react';
import { Vehicle, VehicleHistoryItem } from '../types';
import { FileSpreadsheet, Anchor, Truck, CheckCircle2, Clock, User as UserIcon } from 'lucide-react';

interface VehicleTimelineProps {
  vehicle: Vehicle;
  history?: VehicleHistoryItem[];
}

export const VehicleTimeline: React.FC<VehicleTimelineProps> = ({ vehicle, history = [] }) => {
  // Synthesize timeline stages
  const stages = [
    {
      id: 'manifest',
      title: 'Manifest Uploaded',
      subtitle: 'Vehicle imported into E27 system',
      status: 'completed',
      timestamp: vehicle.createdAt,
      actor: history.find((h) => h.action.includes('Manifest'))?.userName || 'Admin',
      icon: FileSpreadsheet,
      badgeColor: 'bg-blue-600',
    },
    {
      id: 'port',
      title: 'At Dar es Salaam Port (TPA)',
      subtitle: 'Awaiting port clearance & release',
      status: 'completed',
      timestamp: vehicle.createdAt,
      actor: 'Port Terminal Logistics',
      icon: Anchor,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'transit',
      title: 'Released from Port (On Transit)',
      subtitle: 'Departed port; in transit to E27 Yard',
      status: vehicle.status === 'ON TRANSIT' || vehicle.status === 'RECEIVED AT GALCO' ? 'completed' : 'pending',
      timestamp: vehicle.releasedAt,
      actor: vehicle.releasedByName || (vehicle.status !== 'AT PORT' ? 'Port Release Officer' : undefined),
      icon: Truck,
      badgeColor: vehicle.status === 'ON TRANSIT' || vehicle.status === 'RECEIVED AT GALCO' ? 'bg-orange-500' : 'bg-slate-300',
    },
    {
      id: 'galco',
      title: 'Received at E27 Yard',
      subtitle: 'Physically inspected & received in yard',
      status: vehicle.status === 'RECEIVED AT GALCO' ? 'completed' : 'pending',
      timestamp: vehicle.receivedAt,
      actor: vehicle.receivedByName || (vehicle.status === 'RECEIVED AT GALCO' ? 'E27 Yard Officer' : undefined),
      icon: CheckCircle2,
      badgeColor: vehicle.status === 'RECEIVED AT GALCO' ? 'bg-emerald-600' : 'bg-slate-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6 my-2">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = stage.status === 'completed';

          return (
            <div key={stage.id} className="relative group">
              {/* Dot marker */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-white transition-transform group-hover:scale-110 ${stage.badgeColor}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              {/* Content Box */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50/70 border-dashed border-slate-300 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <span className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-500'}`}>
                    {stage.title}
                  </span>
                  {stage.timestamp && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(stage.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mb-2">{stage.subtitle}</p>

                {stage.actor && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                    <UserIcon className="w-3 h-3 text-slate-500" />
                    <span>Officer / User: <strong className="text-slate-900">{stage.actor}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw Event History Logs if available */}
      {history.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            System Movement Audit Log Entries ({history.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
            {history.map((h) => (
              <div key={h.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-900">{h.action}</span>
                  {h.notes && <p className="text-slate-600 text-[11px] mt-0.5">{h.notes}</p>}
                  <div className="text-[11px] text-slate-500 mt-1">
                    By: <span className="font-medium text-slate-700">{h.userName}</span> ({h.userRole})
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 text-right whitespace-nowrap">
                  {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <div className="text-[10px] text-slate-400">
                    {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
