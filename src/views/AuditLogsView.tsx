import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getAuditLogs(user);
      setLogs(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        (log.chassisNumber && log.chassisNumber.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VEHICLE_RELEASED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
            <Truck className="w-3.5 h-3.5 text-orange-600" /> RELEASED FROM PORT
          </span>
        );
      case 'VEHICLE_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> RECEIVED
          </span>
        );
      case 'MANIFEST_UPLOAD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> MANIFEST UPLOAD
          </span>
        );
      case 'USER_LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-600" /> AUTH LOGIN
          </span>
        );
      case 'USER_CREATED':
      case 'USER_UPDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" /> {action}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Activity & Audit Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Immutable system audit logs tracking all port departures, yard receipts, imports, and user activities.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs self-start sm:self-auto"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Actions (Complete Log)</option>
            <option value="VEHICLE_RELEASED">Released From Port (TPA)</option>
            <option value="VEHICLE_RECEIVED">Received at E27 Yard</option>
            <option value="MANIFEST_UPLOAD">Manifest Uploads</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="VEHICLE_UPDATED">Admin Overrides</option>
            <option value="VEHICLE_DELETED">Vehicle Deletions</option>
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by chassis, user name, or detail..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Chassis Number</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Event Description</th>
                <th className="py-3 px-4">Station IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {log.chassisNumber || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{log.userRole}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-md">{log.details}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || '192.168.1.1'}
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
