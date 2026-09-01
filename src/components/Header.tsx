import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Shield,
  Anchor,
  LogOut,
  Menu,
  Warehouse,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            <span>ADMIN</span>
          </span>
        );
      case 'PORT_RELEASE':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <Anchor className="w-3.5 h-3.5 text-amber-700" />
            <span className="sm:hidden">RELEASE</span>
            <span className="hidden sm:inline">PORT RELEASE OFFICER</span>
          </span>
        );
      case 'GALCO_RECEIVING':
        return (
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            <Warehouse className="w-3.5 h-3.5 text-emerald-700" />
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md ring-2 ring-white/10 tracking-wider flex-shrink-0">
                E27
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-white text-sm sm:text-lg whitespace-nowrap">
                    E27 <span className="text-blue-400">ICDV</span> <span className="text-blue-300 font-bold">VTMS</span>
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Active User Role Badge */}
            <div className="flex items-center gap-1.5">
              {getRoleBadge(user?.role)}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-bold text-slate-200 leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">@{user?.username}</div>
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
