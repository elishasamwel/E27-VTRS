import React, { useEffect, useState, useRef } from 'react';
import { DashboardStats, Vehicle, VehicleStatus } from '../types';
import { ApiService } from '../services/api';
import { FirestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatusBadge } from '../components/StatusBadge';
import { ChassisSearchCard } from '../components/ChassisSearchCard';
import {
  Car,
  Anchor,
  Truck,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  onOpenUpload: () => void;
  onViewVehicle: (vehicle: Vehicle) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenUpload,
  onViewVehicle,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isFirstLoad = useRef(true);

  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [fetchedStats, fetchedVehicles] = await Promise.all([
        ApiService.getStats(undefined, user),
        ApiService.getVehicles({ status: 'ALL' }, user),
      ]);
      setStats(fetchedStats);
      // Sort recent updated
      setRecentVehicles(
        [...fetchedVehicles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6)
      );
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await ApiService.clearAllData(user);
      showSuccess('All operational data cleared successfully. System is now completely clean and ready for new manifest uploads.');
      setShowClearModal(false);
      setStats({
        totalVehicles: 0,
        atPortCount: 0,
        onTransitCount: 0,
        receivedGalcoCount: 0,
        releasedTodayCount: 0,
        receivedTodayCount: 0,
        totalManifests: 0,
        activeUsersCount: stats?.activeUsersCount || 0,
        vesselsCount: 0,
        vesselStats: [],
        activityByDay: [],
        statusDistribution: [
          { name: 'AT PORT', value: 0, color: '#f59e0b' },
          { name: 'ON TRANSIT', value: 0, color: '#f97316' },
          { name: 'RECEIVED AT GALCO', value: 0, color: '#10b981' },
        ],
      });
      setRecentVehicles([]);
      await loadDashboardData();
    } catch (err: any) {
      showError(err.message || 'Failed to clear operational data.');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    let unsubscribeFirestore: (() => void) | null = null;
    try {
      unsubscribeFirestore = FirestoreService.subscribeVehicles((vehicles) => {
        if (vehicles) {
          const total = vehicles.length;
          const atPort = vehicles.filter((v) => v.status === 'AT PORT').length;
          const onTransit = vehicles.filter((v) => v.status === 'ON TRANSIT').length;
          const received = vehicles.filter((v) => v.status === 'RECEIVED AT GALCO').length;

          setStats((prev) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const releasedToday = vehicles.filter(
              (v) => v.releasedAt && v.releasedAt.startsWith(todayStr)
            ).length;
            const receivedToday = vehicles.filter(
              (v) => v.receivedAt && v.receivedAt.startsWith(todayStr)
            ).length;

            return {
              totalVehicles: total,
              atPortCount: atPort,
              onTransitCount: onTransit,
              receivedGalcoCount: received,
              releasedTodayCount: releasedToday || prev?.releasedTodayCount || 0,
              receivedTodayCount: receivedToday || prev?.receivedTodayCount || 0,
              totalManifests: prev?.totalManifests || 0,
              activeUsersCount: prev?.activeUsersCount || 0,
              vesselsCount: prev?.vesselsCount || 0,
              vesselStats: prev?.vesselStats || [],
              activityByDay: prev?.activityByDay || [],
              statusDistribution: [
                { name: 'AT PORT', value: atPort, color: '#f59e0b' },
                { name: 'ON TRANSIT', value: onTransit, color: '#f97316' },
                { name: 'RECEIVED AT GALCO', value: received, color: '#10b981' },
              ],
            };
          });

          setRecentVehicles(
            [...vehicles]
              .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              .slice(0, 6)
          );

          if (isFirstLoad.current) {
            setLoading(false);
            isFirstLoad.current = false;
          }
        }
      });
    } catch (e) {
      console.warn('[AdminDashboard] Firestore subscription fallback active', e);
    }

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 4000);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
    };
  }, [user]);

  const COLORS = ['#f59e0b', '#f97316', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time monitoring of vehicle transfers and operational status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowClearModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
            title="Clear All Data to upload fresh manifests"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Clear All Data</span>
          </button>
          <button
            onClick={loadDashboardData}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Manifest</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Section 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vehicles */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL VEHICLES</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats?.totalVehicles ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
              <span>All registered units</span>
              <span className="text-blue-600 font-semibold flex items-center">
                View table <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* AT PORT */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="p-5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">AT PORT (TPA)</span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
              <Anchor className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-900 tracking-tight">
              {stats?.atPortCount ?? 0}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              <span>Awaiting port clearance & release</span>
            </div>
          </div>
        </div>

        {/* ON TRANSIT */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="p-5 bg-white rounded-2xl border border-orange-200 bg-orange-50/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">ON TRANSIT</span>
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-800 group-hover:bg-orange-200 transition-colors">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-orange-900 tracking-tight">
              {stats?.onTransitCount ?? 0}
            </div>
            <div className="mt-1 text-xs text-orange-700 flex items-center justify-between">
              <span>Travelling to E27 yard</span>
              <span className="font-semibold">{stats?.releasedTodayCount ?? 0} released today</span>
            </div>
          </div>
        </div>

        {/* RECEIVED */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">RECEIVED</span>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-900 tracking-tight">
              {stats?.receivedGalcoCount ?? 0}
            </div>
            <div className="mt-1 text-xs text-emerald-700 flex items-center justify-between">
              <span>Physically received in yard</span>
              <span className="font-semibold">{stats?.receivedTodayCount ?? 0} received today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Chassis Search for Fast Action */}
      <div>
        <ChassisSearchCard
          onStatusUpdated={loadDashboardData}
          onViewDetails={onViewVehicle}
          autoFocus={false}
        />
      </div>

      {/* Data Visualizations (Section 22) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">Vehicle Status Distribution</h3>
              <span className="text-xs text-slate-500 font-medium">Real-time DB</span>
            </div>
            <p className="text-xs text-slate-500">
              Breakdown across the 3 core vehicle lifecycle stages
            </p>
          </div>

          <div className="h-64 my-2">
            {stats && stats.totalVehicles > 0 && Array.isArray(stats.statusDistribution) && stats.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(stats.statusDistribution || []).map((entry, index) => (
                      <Cell key={`pie-cell-${entry?.name || ''}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No vehicle data available
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" />
              <span className="text-slate-600 block text-[11px]">At Port</span>
              <strong className="text-slate-900 text-sm">{stats?.atPortCount ?? 0}</strong>
            </div>
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 mr-1" />
              <span className="text-slate-600 block text-[11px]">On Transit</span>
              <strong className="text-slate-900 text-sm">{stats?.onTransitCount ?? 0}</strong>
            </div>
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />
              <span className="text-slate-600 block text-[11px]">Received</span>
              <strong className="text-slate-900 text-sm">{stats?.receivedGalcoCount ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Transfer Velocity Bar Chart (Last 7 Days) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900">Daily Transfer Velocity</h3>
              <span className="text-xs text-slate-500 font-medium">Released vs Received</span>
            </div>
            <p className="text-xs text-slate-500">
              Number of vehicles dispatched from Port compared to vehicles received at GALCO
            </p>
          </div>

          <div className="h-64 my-2">
            {stats && stats.activityByDay ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.activityByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="released" name="Released from Port" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" name="Received at GALCO" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="imported" name="New Manifest" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No activity data available
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Operational cadence: VTMS Live Synchronized</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              View detailed reports ➔
            </button>
          </div>
        </div>
      </div>

      {/* Recent Vehicles Live Movement Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Vehicle Movements</h3>
            <p className="text-xs text-slate-500">Latest vehicle operations and state transitions</p>
          </div>
          <button
            onClick={() => onNavigate('vehicles')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View all vehicles ({stats?.totalVehicles ?? 0})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
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
                <th className="py-3 px-4">Last Handled By</th>
                <th className="py-3 px-4">Updated Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No vehicles found in database.
                  </td>
                </tr>
              ) : (
                recentVehicles.map((veh, idx) => (
                  <tr
                    key={`dash-recent-veh-${veh.id || ''}-${veh.chassisNumber || ''}-${idx}`}
                    onClick={() => onViewVehicle(veh)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{veh.serialNumber}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {veh.chassisNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{veh.description}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-100">
                        {veh.vesselName || 'MV TRANS CARRIER'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={veh.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {veh.status === 'RECEIVED AT GALCO'
                        ? veh.receivedByName || 'GALCO Officer'
                        : veh.status === 'ON TRANSIT'
                        ? veh.releasedByName || 'Port Officer'
                        : 'System Import'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(veh.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewVehicle(veh);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear All Operational Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Clear & Wipe All Data?</h3>
                <p className="text-xs text-slate-500">Prepare system for fresh manifest upload</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <p className="font-semibold">This action will immediately delete:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>All vehicle records and tracking histories</li>
                <li>All uploaded manifests and marine vessels</li>
                <li>All activity logs from previous sessions</li>
              </ul>
              <p className="text-amber-700 italic pt-1 border-t border-amber-200/60">
                Admin, Port Officer, and Galco Receiving accounts will remain active and untouched.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={isClearing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Clearing Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete & Clear All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
