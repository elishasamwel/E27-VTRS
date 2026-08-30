import { Vehicle, User, Manifest, AuditLog, DashboardStats, VehicleStatus, MarineVessel } from '../types';
import { FirestoreService } from './firestoreService';

const API_BASE = '/api';

export class ApiService {
  private static getHeaders(user?: User | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (user?.id) {
      headers['x-user-id'] = user.id;
    }
    return headers;
  }

  // Auth
  static async login(identifier: string, passwordAttempt: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: passwordAttempt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  }

  // Vehicles
  static async getVehicles(params?: {
    status?: VehicleStatus | 'ALL';
    search?: string;
    vesselName?: string;
    startDate?: string;
    endDate?: string;
  }, user?: User | null): Promise<Vehicle[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.vesselName && params.vesselName !== 'ALL') query.set('vesselName', params.vesselName);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/vehicles?${query.toString()}`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load vehicles');

    // Asynchronously ensure Firestore is seeded/updated
    if (data.vehicles && data.vehicles.length > 0) {
      FirestoreService.batchSetVehicles(data.vehicles).catch(() => {});
    }

    return data.vehicles;
  }

  static async searchChassis(query: string, status?: VehicleStatus, user?: User | null): Promise<Vehicle[]> {
    const params = new URLSearchParams({ q: query });
    if (status) params.set('status', status);

    const res = await fetch(`${API_BASE}/vehicles/search?${params.toString()}`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    return data.matches || [];
  }

  static async getVehicleDetails(id: string, user?: User | null): Promise<{ vehicle: Vehicle; history: any[] }> {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Vehicle not found');
    return data;
  }

  static async releaseVehicle(id: string, notes?: string, user?: User | null): Promise<Vehicle> {
    const res = await fetch(`${API_BASE}/vehicles/${id}/release`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to release vehicle');

    // Sync to Firestore
    if (data.vehicle) {
      FirestoreService.setVehicle(data.vehicle).catch(console.warn);
      FirestoreService.addAuditLog({
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        action: 'VEHICLE_RELEASED_PORT',
        details: `Released vehicle ${data.vehicle.chassisNumber} to ON TRANSIT`,
        vehicleId: data.vehicle.id,
        chassisNumber: data.vehicle.chassisNumber,
        userId: user?.id || 'sys',
        userName: user?.name || 'User',
        userRole: user?.role || 'PORT_RELEASE',
        timestamp: new Date().toISOString(),
      }).catch(console.warn);
    }

    return data.vehicle;
  }

  static async receiveVehicle(id: string, notes?: string, user?: User | null): Promise<Vehicle> {
    const res = await fetch(`${API_BASE}/vehicles/${id}/receive`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to receive vehicle');

    // Sync to Firestore
    if (data.vehicle) {
      FirestoreService.setVehicle(data.vehicle).catch(console.warn);
      FirestoreService.addAuditLog({
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        action: 'VEHICLE_RECEIVED_GALCO',
        details: `Received vehicle ${data.vehicle.chassisNumber} at E27 yard`,
        vehicleId: data.vehicle.id,
        chassisNumber: data.vehicle.chassisNumber,
        userId: user?.id || 'sys',
        userName: user?.name || 'User',
        userRole: user?.role || 'GALCO_RECEIVING',
        timestamp: new Date().toISOString(),
      }).catch(console.warn);
    }

    return data.vehicle;
  }

  static async updateVehicle(
    id: string,
    updates: { serialNumber?: any; chassisNumber?: string; description?: string; status?: VehicleStatus; vesselName?: string; voyageNumber?: string; notes?: string },
    user?: User | null
  ): Promise<Vehicle> {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(user),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update vehicle');

    if (data.vehicle) {
      FirestoreService.setVehicle(data.vehicle).catch(console.warn);
    }

    return data.vehicle;
  }

  static async deleteVehicle(id: string, user?: User | null): Promise<void> {
    const res = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete vehicle');

    FirestoreService.removeVehicle(id).catch(console.warn);
  }

  // Manifests
  static async validateManifest(
    rows: any[],
    vesselMeta?: { vesselName?: string; voyageNumber?: string },
    user?: User | null
  ) {
    const res = await fetch(`${API_BASE}/manifests/validate`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify({
        rows,
        vesselName: vesselMeta?.vesselName,
        voyageNumber: vesselMeta?.voyageNumber,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Validation failed');
    return data;
  }

  static async importManifest(
    fileName: string,
    validRows: any[],
    vesselMeta?: { vesselName?: string; voyageNumber?: string; portOfDischarge?: string; isVisibleInOperations?: boolean },
    user?: User | null
  ): Promise<{ manifest: Manifest; vessel?: MarineVessel; importedCount: number }> {
    const res = await fetch(`${API_BASE}/manifests/import`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify({
        fileName,
        validRows,
        vesselName: vesselMeta?.vesselName,
        voyageNumber: vesselMeta?.voyageNumber,
        portOfDischarge: vesselMeta?.portOfDischarge,
        isVisibleInOperations: vesselMeta?.isVisibleInOperations !== undefined ? vesselMeta.isVisibleInOperations : true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');

    if (data.manifest) {
      FirestoreService.setManifest(data.manifest).catch(console.warn);
    }
    if (data.vessel) {
      FirestoreService.setVessel(data.vessel).catch(console.warn);
    }

    return data;
  }

  static async getManifests(user?: User | null): Promise<Manifest[]> {
    const res = await fetch(`${API_BASE}/manifests`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load manifests');
    return data.manifests;
  }

  static async deleteManifest(id: string, user?: User | null): Promise<{ removedCount: number }> {
    const res = await fetch(`${API_BASE}/manifests/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete manifest');

    // Firestore sync: remove manifest record
    FirestoreService.removeManifest(id).catch(console.warn);

    return { removedCount: data.removedCount || 0 };
  }

  // Marine Vessels
  static async getVessels(visibleOnly?: boolean, user?: User | null): Promise<MarineVessel[]> {
    const query = visibleOnly ? '?visibleOnly=true' : '';
    const res = await fetch(`${API_BASE}/vessels${query}`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load marine vessels');
    return data.vessels || [];
  }

  static async createVessel(
    payload: { name: string; voyageNumber?: string; portOfDischarge?: string; notes?: string; isVisibleInOperations?: boolean },
    user?: User | null
  ): Promise<MarineVessel> {
    const res = await fetch(`${API_BASE}/vessels`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create vessel');

    if (data.vessel) {
      FirestoreService.setVessel(data.vessel).catch(console.warn);
    }
    return data.vessel;
  }

  static async updateVessel(
    id: string,
    payload: Partial<MarineVessel>,
    user?: User | null
  ): Promise<MarineVessel> {
    const res = await fetch(`${API_BASE}/vessels/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(user),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update vessel');

    if (data.vessel) {
      FirestoreService.setVessel(data.vessel).catch(console.warn);
    }
    return data.vessel;
  }

  static async deleteVessel(id: string, user?: User | null): Promise<void> {
    const res = await fetch(`${API_BASE}/vessels/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete vessel');

    FirestoreService.removeVessel(id).catch(console.warn);
  }

  static async updateVesselsVisibility(visibleVessels: string[], user?: User | null): Promise<MarineVessel[]> {
    const res = await fetch(`${API_BASE}/vessels-visibility`, {
      method: 'PUT',
      headers: this.getHeaders(user),
      body: JSON.stringify({ visibleVessels }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update vessels visibility');
    return data.vessels || [];
  }

  // Users
  static async getUsers(user?: User | null): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load users');
    return data.users;
  }

  static async createUser(payload: any, user?: User | null): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: this.getHeaders(user),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');

    if (data.user) {
      FirestoreService.setUser(data.user).catch(console.warn);
    }

    return data.user;
  }

  static async updateUser(id: string, payload: any, user?: User | null): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(user),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');

    if (data.user) {
      FirestoreService.setUser(data.user).catch(console.warn);
    }

    return data.user;
  }

  // Audit Logs
  static async getAuditLogs(user?: User | null): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load audit logs');
    return data.logs;
  }

  // Stats
  static async getStats(vesselFilter?: string, user?: User | null): Promise<DashboardStats> {
    const query = vesselFilter && vesselFilter !== 'ALL' ? `?vesselName=${encodeURIComponent(vesselFilter)}` : '';
    const res = await fetch(`${API_BASE}/stats${query}`, {
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load stats');
    return data;
  }

  // Reset
  static async resetDatabase(user?: User | null): Promise<void> {
    const res = await fetch(`${API_BASE}/seed/reset`, {
      method: 'POST',
      headers: this.getHeaders(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Reset failed');
  }
}
