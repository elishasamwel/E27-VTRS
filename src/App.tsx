import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { AdminDashboard } from './views/AdminDashboard';
import { AdminVehiclesView } from './views/AdminVehiclesView';
import { PortDashboard } from './views/PortDashboard';
import { GalcoDashboard } from './views/GalcoDashboard';
import { UserManagementView } from './views/UserManagementView';
import { AuditLogsView } from './views/AuditLogsView';
import { ReportsView } from './views/ReportsView';
import { AdminVesselsManifestsView } from './views/AdminVesselsManifestsView';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import { ManifestUploadModal } from './components/ManifestUploadModal';
import { Vehicle } from './types';

const MainLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Global Vehicle Profile Modal
  const [detailedVehicle, setDetailedVehicle] = useState<Vehicle | null>(null);

  // Manifest Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Key to force refresh of active views when data changes
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigate = (viewId: string) => {
    if (viewId === 'manifest-upload') {
      setIsUploadOpen(true);
    } else {
      setCurrentView(viewId);
    }
  };

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  // Render view based on role and active selection
  const renderContent = () => {
    // 1. ADMIN VIEWS
    if (user.role === 'ADMIN') {
      switch (currentView) {
        case 'dashboard':
          return (
            <AdminDashboard
              key={refreshKey}
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadOpen(true)}
              onViewVehicle={(v) => setDetailedVehicle(v)}
            />
          );
        case 'vehicles':
          return (
            <AdminVehiclesView
              key={refreshKey}
              onViewVehicle={(v) => setDetailedVehicle(v)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          );
        case 'vessels-manifests':
          return (
            <AdminVesselsManifestsView
              key={refreshKey}
              onNavigateToVehicles={(vesselName) => {
                setCurrentView('vehicles');
              }}
              onOpenUploadModal={() => setIsUploadOpen(true)}
            />
          );
        case 'users':
          return <UserManagementView key={refreshKey} />;
        case 'activity-logs':
          return <AuditLogsView key={refreshKey} />;
        case 'reports':
          return <ReportsView key={refreshKey} />;
        default:
          return (
            <AdminDashboard
              key={refreshKey}
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadOpen(true)}
              onViewVehicle={(v) => setDetailedVehicle(v)}
            />
          );
      }
    }

    // 2. PORT RELEASE USER VIEWS
    if (user.role === 'PORT_RELEASE') {
      return (
        <PortDashboard
          key={refreshKey}
          onViewVehicle={(v) => setDetailedVehicle(v)}
          activeSubView={
            currentView === 'search-vehicle'
              ? 'search'
              : currentView === 'at-port'
              ? 'at-port'
              : currentView === 'released-vehicles'
              ? 'released'
              : 'dashboard'
          }
        />
      );
    }

    // 3. GALCO RECEIVING USER VIEWS
    if (user.role === 'GALCO_RECEIVING') {
      return (
        <GalcoDashboard
          key={refreshKey}
          onViewVehicle={(v) => setDetailedVehicle(v)}
          activeSubView={
            currentView === 'search-vehicle'
              ? 'search'
              : currentView === 'on-transit'
              ? 'on-transit'
              : currentView === 'received-vehicles'
              ? 'received'
              : 'dashboard'
          }
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Corporate Navigation Header */}
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onRefreshData={handleRefresh}
      />

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {renderContent()}
        </main>
      </div>

      {/* Global Vehicle Detail Modal */}
      <VehicleDetailModal
        isOpen={!!detailedVehicle}
        vehicle={detailedVehicle}
        onClose={() => setDetailedVehicle(null)}
      />

      {/* Manifest Upload Modal */}
      <ManifestUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          handleRefresh();
          setCurrentView('vessels-manifests');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </NotificationProvider>
  );
}
