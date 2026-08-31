import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Car,
  Users,
  Activity,
  BarChart3,
  Search,
  Anchor,
  Truck,
  CheckCircle2,
  LogOut,
  X,
  Ship,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'ADMIN';

  // Section 17 exact navigation items
  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'vessels-manifests', label: 'Vessels & Manifests', icon: Ship },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'activity-logs', label: 'Activity Logs', icon: Activity },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const portNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search-vehicle', label: 'Search Vehicle', icon: Search },
    { id: 'at-port', label: 'At Port', icon: Anchor },
    { id: 'released-vehicles', label: 'Released Vehicles', icon: Truck },
  ];

  const galcoNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search-vehicle', label: 'Search Vehicle', icon: Search },
    { id: 'on-transit', label: 'On Transit', icon: Truck },
    { id: 'received-vehicles', label: 'Received Vehicles', icon: CheckCircle2 },
  ];

  const navItems = role === 'ADMIN' ? adminNav : role === 'PORT_RELEASE' ? portNav : galcoNav;

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header for mobile */}
        <div className="p-4 flex items-center justify-between lg:hidden border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Menu</span>
          <button onClick={onCloseMobile} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {role === 'ADMIN' && 'Administration Hub'}
            {role === 'PORT_RELEASE' && 'Port Release Operations'}
            {role === 'GALCO_RECEIVING' && 'E27 Yard Receiving'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="text-[11px] text-slate-400 font-medium">Operating Yard:</div>
            <div className="font-bold text-slate-200">E27 ICDV (Tanzania)</div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Live & Synchronized</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
