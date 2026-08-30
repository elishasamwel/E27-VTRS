export type UserRole = 'ADMIN' | 'PORT_RELEASE' | 'GALCO_RECEIVING';

export type VehicleStatus = 'AT PORT' | 'ON TRANSIT' | 'RECEIVED AT GALCO';

export interface MarineVessel {
  id: string;
  name: string;
  voyageNumber?: string;
  portOfDischarge?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  isVisibleInOperations: boolean;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  // Computed summary stats
  totalVehicles?: number;
  atPortCount?: number;
  onTransitCount?: number;
  receivedCount?: number;
  completionRate?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Vehicle {
  id: string;
  serialNumber: number | string;
  chassisNumber: string;
  description: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
  manifestId?: string;

  // Marine Vessel & Voyage Info
  vesselName?: string;
  voyageNumber?: string;
  portOfDischarge?: string;
  
  // Port Release Info
  releasedByUserId?: string;
  releasedByName?: string;
  releasedAt?: string; // ISO String
  
  // Galco Receiving Info
  receivedByUserId?: string;
  receivedByName?: string;
  receivedAt?: string; // ISO String
}

export interface VehicleHistoryItem {
  id: string;
  vehicleId: string;
  action: string;
  previousStatus: VehicleStatus | 'NONE';
  newStatus: VehicleStatus;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string; // ISO String
  notes?: string;
  vesselName?: string;
}

export interface Manifest {
  id: string;
  fileName: string;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedAt: string;
  totalRecords: number;
  successfulRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  vesselName?: string;
  voyageNumber?: string;
  portOfDischarge?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  vehicleId?: string;
  chassisNumber?: string;
  vesselName?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  ipAddress?: string;
}

export interface VesselStatItem {
  vesselName: string;
  voyageNumber?: string;
  total: number;
  atPort: number;
  onTransit: number;
  received: number;
  completionRate: number; // percentage 0-100
}

export interface DashboardStats {
  totalVehicles: number;
  atPortCount: number;
  onTransitCount: number;
  receivedGalcoCount: number;
  releasedTodayCount: number;
  receivedTodayCount: number;
  totalManifests: number;
  activeUsersCount: number;
  vesselsCount: number;
  vesselStats: VesselStatItem[];
  activityByDay: {
    date: string;
    released: number;
    received: number;
    imported: number;
  }[];
  statusDistribution: {
    name: VehicleStatus;
    value: number;
    color: string;
  }[];
}

export interface ManifestPreviewRow {
  serialNumber: string | number;
  chassisNumber: string;
  description: string;
  vesselName?: string;
  voyageNumber?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errorMessage?: string;
}

export interface ManifestValidationResult {
  fileName: string;
  vesselName?: string;
  voyageNumber?: string;
  total: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ManifestPreviewRow[];
}
