import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Shield,
  Truck,
  Anchor,
  LogOut,
  Menu,
  RotateCcw,
  User as UserIcon,
  ChevronDown,
  Warehouse,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onRefreshData }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const handleRoleSelect = (role: UserRole) => {
    switchDemoRole(role);
    setRoleDropdownOpen(false);
    showSuccess(`Switched active session to ${role.replace('_', ' ')}.`);
    if (onRefreshData) onRefreshData();
  };

  const handleResetData = async () => {
    if (window.confirm('Reset database to default initial demo manifest and vehicles?')) {
      try {
        await ApiService.resetDatabase(user);
        showSuccess('Database reset to initial demo dataset successfully.');
        if (onRefreshData) onRefreshData();
      } catch (err: any) {
        showError('Failed to reset database');
      }
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-700" />
            <span>ADMIN</span>
          </span>
        );
      case 'PORT_RELEASE':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <Anchor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700" />
            <span className="sm:hidden">RELEASE</span>
            <span className="hidden sm:inline">PORT RELEASE OFFICER</span>
          </span>
        );
      case 'GALCO_RECEIVING':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <Warehouse className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700" />
            <span className="sm:hidden">RECEIVING</span>
            <span className="hidden sm:inline">E27 RECEIVING OFFICER</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title (Desktop) + Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Hidden on mobile view, visible on computer/tablet view */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-white/10 tracking-wider">
                E27
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-white text-base sm:text-lg">
                    E27 <span className="text-blue-400">ICDV</span> <span className="text-blue-300 font-bold">VTMS</span>
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Firebase Live
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Demo Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-xs"
              >
                <span className="text-slate-400 hidden md:inline">Role:</span>
                {getRoleBadge(user?.role)}
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRoleDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Role (Live Testing)
                    </div>
                    <button
                      onClick={() => handleRoleSelect('ADMIN')}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        user?.role === 'ADMIN' ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold">System Administrator</div>
                          <div className="text-[10px] text-slate-500">Full operations & manifest control</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleRoleSelect('PORT_RELEASE')}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-amber-50 transition-colors ${
                        user?.role === 'PORT_RELEASE' ? 'bg-amber-50/80 font-bold text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-semibold">Port Release User</div>
                          <div className="text-[10px] text-slate-500">AT PORT ➔ ON TRANSIT</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleRoleSelect('GALCO_RECEIVING')}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                        user?.role === 'GALCO_RECEIVING' ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold">E27 Receiving User</div>
                          <div className="text-[10px] text-slate-500">ON TRANSIT ➔ RECEIVED AT E27</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Reset Demo Data Button */}
            <button
              onClick={handleResetData}
              title="Reset initial demo data"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-bold text-slate-200 leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
