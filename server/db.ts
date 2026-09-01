import fs from 'fs';
import path from 'path';
import { User, Vehicle, VehicleHistoryItem, Manifest, AuditLog, VehicleStatus, MarineVessel } from '../src/types';

// Persistent database store with JSON file durability and initial seed fallback
class Database {
  private users: User[] = [];
  private userPasswords: Map<string, string> = new Map(); // id -> password
  private vehicles: Vehicle[] = [];
  private history: VehicleHistoryItem[] = [];
  private manifests: Manifest[] = [];
  private auditLogs: AuditLog[] = [];
  private vessels: MarineVessel[] = [];
  private filePath = path.join(process.cwd(), 'data', 'vtms-database.json');

  constructor() {
    this.loadFromFile();
  }

  private saveToFile() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        users: this.users,
        userPasswords: Object.fromEntries(this.userPasswords),
        vehicles: this.vehicles,
        history: this.history,
        manifests: this.manifests,
        auditLogs: this.auditLogs,
        vessels: this.vessels,
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist database to file:', err);
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.users) && data.users.length > 0) {
          this.users = data.users;
          this.userPasswords = new Map(Object.entries(data.userPasswords || {}));
          this.vehicles = data.vehicles || [];
          this.history = data.history || [];
          this.manifests = data.manifests || [];
          this.auditLogs = data.auditLogs || [];
          this.vessels = (data.vessels || []).filter((v: MarineVessel) => v.name.toUpperCase() !== 'E27' && v.id !== 'e27');

          // Ensure default admin user always exists and is active
          if (!this.users.some((u) => u.username === 'admin')) {
            const adminUser: User = {
              id: 'usr-admin-1',
              name: 'Elisha Samwel',
              email: 'admin@e27.co.tz',
              username: 'admin',
              role: 'ADMIN',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            };
            this.users.unshift(adminUser);
            this.userPasswords.set(adminUser.id, 'admin123');
          }
          return;
        }
      }
    } catch (err) {
      console.error('[DB] Failed to load database from file, re-seeding baseline:', err);
    }
    this.seedInitialData();
  }

  public seedInitialData() {
    this.users = [];
    this.userPasswords.clear();
    this.vehicles = [];
    this.history = [];
    this.manifests = [];
    this.auditLogs = [];
    this.vessels = [];

    const now = new Date();
    const todayIso = now.toISOString();

    // 1. Primary Administrator
    const adminUser: User = {
      id: 'usr-admin-1',
      name: 'Elisha Samwel',
      email: 'admin@galco.co.tz',
      username: 'admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: todayIso,
      lastLogin: todayIso,
    };
    this.users.push(adminUser);
    this.userPasswords.set(adminUser.id, 'admin123');

    // 2. Default Port Release Officer
    const portUser: User = {
      id: 'usr-port-1',
      name: 'John Mrosso (TPA Port)',
      email: 'port@galco.co.tz',
      username: 'port_officer',
      role: 'PORT_RELEASE',
      status: 'ACTIVE',
      createdAt: todayIso,
      lastLogin: todayIso,
    };
    this.users.push(portUser);
    this.userPasswords.set(portUser.id, 'port123');

    // 3. Default E27 Yard Receiving Officer
    const galcoUser: User = {
      id: 'usr-galco-1',
      name: 'Hamis Bakari (E27 Yard)',
      email: 'yard@galco.co.tz',
      username: 'galco_receiver',
      role: 'GALCO_RECEIVING',
      status: 'ACTIVE',
      createdAt: todayIso,
      lastLogin: todayIso,
    };
    this.users.push(galcoUser);
    this.userPasswords.set(galcoUser.id, 'yard123');

    this.saveToFile();
  }

  // User methods
  public authenticateResult(
    identifier: string,
    passwordAttempt: string
  ): { success: boolean; user?: User; error?: string; isPending?: boolean } {
    const cleanId = identifier.trim().toLowerCase();
    const user = this.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );
    if (!user) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const storedPass = this.userPasswords.get(user.id);
    if (storedPass !== passwordAttempt) {
      return { success: false, error: 'Invalid username or password.' };
    }

    if (user.status === 'PENDING_APPROVAL') {
      return {
        success: false,
        error: 'Your account registration is pending Administrator approval. Please wait for an Admin to activate your account.',
        isPending: true,
      };
    }

    if (user.status === 'INACTIVE') {
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact the Administrator.',
      };
    }

    user.lastLogin = new Date().toISOString();
    this.logAudit({
      action: 'User Logged In',
      details: `User ${user.name} (@${user.username}) logged in successfully as ${user.role}.`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });
    return { success: true, user: { ...user } };
  }

  public authenticate(identifier: string, passwordAttempt: string): User | null {
    const result = this.authenticateResult(identifier, passwordAttempt);
    return result.success && result.user ? result.user : null;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public registerUser(payload: {
    name: string;
    username: string;
    email?: string;
    password: string;
    role: any;
  }): { success: boolean; user?: User; error?: string } {
    const cleanUsername = payload.username.trim().toLowerCase();
    const cleanEmail = (payload.email || '').trim().toLowerCase();

    if (!cleanUsername || !payload.password || !payload.name.trim()) {
      return { success: false, error: 'Full name, username, and password are required.' };
    }

    const existing = this.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername ||
        (cleanEmail && u.email.toLowerCase() === cleanEmail)
    );
    if (existing) {
      return { success: false, error: 'A user with this username or email already exists.' };
    }

    const assignedRole = payload.role === 'ADMIN' || payload.role === 'GALCO_RECEIVING' ? payload.role : 'PORT_RELEASE';

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: payload.name.trim(),
      username: cleanUsername,
      email: cleanEmail || `${cleanUsername}@e27.co.tz`,
      role: assignedRole,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.userPasswords.set(newUser.id, payload.password);

    this.logAudit({
      action: 'User Registered (Pending Approval)',
      details: `New self-registration by ${newUser.name} (@${newUser.username}) requested role: ${newUser.role}. Status: PENDING_APPROVAL.`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
    });

    return { success: true, user: { ...newUser } };
  }

  public approveUser(userId: string, actor: User): { success: boolean; user?: User; error?: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    user.status = 'ACTIVE';
    this.logAudit({
      action: 'User Approved & Activated',
      details: `Admin ${actor.name} approved and activated account for ${user.name} (@${user.username}) with role ${user.role}.`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true, user: { ...user } };
  }

  public deleteUser(userId: string, actor: User): { success: boolean; error?: string } {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return { success: false, error: 'User not found.' };
    }
    const user = this.users[idx];
    if (user.username === 'admin') {
      return { success: false, error: 'Cannot delete the primary System Administrator account.' };
    }

    this.users.splice(idx, 1);
    this.userPasswords.delete(userId);

    this.logAudit({
      action: 'User Removed',
      details: `Admin ${actor.name} removed user account ${user.name} (@${user.username}).`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true };
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>, password: string, actor: User): User {
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.userPasswords.set(newUser.id, password || 'e27pass123');

    this.logAudit({
      action: 'User Created',
      details: `Admin ${actor.name} created user account ${newUser.name} (${newUser.email}) with role ${newUser.role}.`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { ...newUser };
  }

  public updateUser(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
    newPassword?: string,
    actor?: User
  ): User | null {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    this.users[idx] = { ...this.users[idx], ...updates };
    if (newPassword) {
      this.userPasswords.set(id, newPassword);
    }

    if (actor) {
      this.logAudit({
        action: 'User Updated',
        details: `Admin ${actor.name} updated account for ${this.users[idx].name}.`,
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
      });
    }

    return { ...this.users[idx] };
  }

  // Vehicles methods
  public getVehicles(
    filters?: {
      status?: VehicleStatus | 'ALL';
      search?: string;
      vesselName?: string;
      startDate?: string;
      endDate?: string;
      operationalOnly?: boolean;
    },
    actor?: User
  ): Vehicle[] {
    let result = [...this.vehicles];

    // Filter by operational vessel visibility for operational users or if operationalOnly is true
    const isOperationalRole = actor && (actor.role === 'PORT_RELEASE' || actor.role === 'GALCO_RECEIVING');
    if (filters?.operationalOnly || isOperationalRole) {
      const hiddenVesselNames = new Set(
        this.vessels
          .filter((v) => v.isVisibleInOperations === false)
          .map((v) => v.name.toUpperCase())
      );
      result = result.filter((v) => {
        if (!v.vesselName) return true;
        return !hiddenVesselNames.has(v.vesselName.toUpperCase());
      });
    }

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((v) => v.status === filters.status);
    }

    if (filters?.vesselName && filters.vesselName !== 'ALL') {
      const cleanVessel = filters.vesselName.trim().toUpperCase();
      result = result.filter((v) => v.vesselName && v.vesselName.trim().toUpperCase() === cleanVessel);
    }

    if (filters?.search) {
      const q = filters.search.trim().toUpperCase();
      result = result.filter(
        (v) =>
          (v.chassisNumber || '').toUpperCase().includes(q) ||
          (v.description || '').toUpperCase().includes(q) ||
          String(v.serialNumber || '').includes(q) ||
          (v.vesselName && v.vesselName.toUpperCase().includes(q)) ||
          (v.voyageNumber && v.voyageNumber.toUpperCase().includes(q))
      );
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((v) => new Date(v.createdAt).getTime() >= start);
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime() + 24 * 3600 * 1000;
      result = result.filter((v) => new Date(v.createdAt).getTime() <= end);
    }

    // Sort descending by serial or creation
    return result.sort((a, b) => {
      const sA = Number(a.serialNumber) || 0;
      const sB = Number(b.serialNumber) || 0;
      return sA - sB;
    });
  }

  public getVehicleById(id: string): Vehicle | undefined {
    return this.vehicles.find((v) => v.id === id);
  }

  public getVehicleByChassis(chassisNumber: string): Vehicle | undefined {
    const clean = chassisNumber.trim().toUpperCase();
    return this.vehicles.find((v) => v.chassisNumber.trim().toUpperCase() === clean);
  }

  // Chassis Search Engine (Section 4 & Section 23)
  // Searches exact last 5 characters case-insensitively, or full chassis match if query is longer/shorter
  public searchChassis(query: string, targetStatus?: VehicleStatus, actor?: User): Vehicle[] {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return [];

    let pool = this.vehicles;

    const isOperationalRole = actor && (actor.role === 'PORT_RELEASE' || actor.role === 'GALCO_RECEIVING');
    if (isOperationalRole) {
      const visibleVesselNames = new Set(
        this.vessels
          .filter((v) => v.isVisibleInOperations)
          .map((v) => v.name.toUpperCase())
      );
      pool = pool.filter((v) => !v.vesselName || visibleVesselNames.has(v.vesselName.toUpperCase()));
    }

    if (targetStatus) {
      pool = pool.filter((v) => v.status === targetStatus);
    }

    // First: exact last-N character matching (especially last 5)
    const exactLastMatches = pool.filter((v) => {
      const chassis = v.chassisNumber.trim().toUpperCase();
      if (cleanQuery.length <= chassis.length) {
        const lastPart = chassis.slice(-cleanQuery.length);
        if (lastPart === cleanQuery) return true;
      }
      return false;
    });

    if (exactLastMatches.length > 0) {
      return exactLastMatches;
    }

    // Fallback: substring match in chassis or serial or description or vessel
    return pool.filter((v) => {
      const chassis = (v.chassisNumber || '').trim().toUpperCase();
      const desc = (v.description || '').trim().toUpperCase();
      const serial = String(v.serialNumber || '').toUpperCase();
      const vessel = (v.vesselName || '').toUpperCase();
      return (
        chassis.includes(cleanQuery) ||
        desc.includes(cleanQuery) ||
        serial === cleanQuery ||
        vessel.includes(cleanQuery)
      );
    });
  }

  // Workflow Action 1: AT PORT -> ON TRANSIT (Port Release User)
  public releaseFromPort(
    vehicleId: string,
    actor: User,
    notes?: string
  ): { success: boolean; error?: string; vehicle?: Vehicle } {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found with this identifier.' };
    }

    if (vehicle.status !== 'AT PORT') {
      if (vehicle.status === 'ON TRANSIT') {
        return {
          success: false,
          error: `This vehicle (${vehicle.chassisNumber}) from vessel ${vehicle.vesselName || 'Unspecified'} is already ON TRANSIT (released by ${vehicle.releasedByName || 'Port Officer'} on ${vehicle.releasedAt ? new Date(vehicle.releasedAt).toLocaleString() : 'earlier'}).`,
        };
      }
      if (vehicle.status === 'RECEIVED AT GALCO') {
        return {
          success: false,
          error: `This vehicle (${vehicle.chassisNumber}) from vessel ${vehicle.vesselName || 'Unspecified'} has already arrived and been RECEIVED AT GALCO.`,
        };
      }
      return { success: false, error: 'Invalid action for current vehicle status.' };
    }

    const now = new Date().toISOString();
    const previousStatus = vehicle.status;
    vehicle.status = 'ON TRANSIT';
    vehicle.updatedAt = now;
    vehicle.releasedByUserId = actor.id;
    vehicle.releasedByName = actor.name;
    vehicle.releasedAt = now;

    // Record History with Vessel Context
    this.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      vehicleId: vehicle.id,
      action: 'Released from Port',
      previousStatus,
      newStatus: 'ON TRANSIT',
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      vesselName: vehicle.vesselName,
      timestamp: now,
      notes: notes || `Vehicle departed Dar es Salaam Port (TPA) for E27 yard (Vessel: ${vehicle.vesselName || 'Port Intake'}).`,
    });

    // Audit Log
    this.logAudit({
      action: 'Vehicle Released from Port',
      details: `Vehicle Serial #${vehicle.serialNumber} (${vehicle.chassisNumber} - ${vehicle.description}, Vessel: ${vehicle.vesselName || 'N/A'}) status changed from AT PORT to ON TRANSIT.`,
      vehicleId: vehicle.id,
      chassisNumber: vehicle.chassisNumber,
      vesselName: vehicle.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true, vehicle: { ...vehicle } };
  }

  // Workflow Action 1B: Undo / Revert Port Release (ON TRANSIT -> AT PORT)
  public undoPortRelease(
    vehicleId: string,
    actor: User,
    reason?: string
  ): { success: boolean; error?: string; vehicle?: Vehicle } {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found with this identifier.' };
    }

    if (vehicle.status !== 'ON TRANSIT') {
      if (vehicle.status === 'AT PORT') {
        return {
          success: false,
          error: `Vehicle (${vehicle.chassisNumber}) is already AT PORT.`,
        };
      }
      if (vehicle.status === 'RECEIVED AT GALCO') {
        return {
          success: false,
          error: `Cannot undo port release because vehicle (${vehicle.chassisNumber}) has already arrived and been RECEIVED AT GALCO / E27 Yard. Use Admin override if status adjustment is required.`,
        };
      }
      return { success: false, error: 'Invalid action for current vehicle status.' };
    }

    const now = new Date().toISOString();
    const previousStatus = vehicle.status;
    const releasedByNameBefore = vehicle.releasedByName;

    vehicle.status = 'AT PORT';
    vehicle.updatedAt = now;
    delete vehicle.releasedByUserId;
    delete vehicle.releasedByName;
    delete vehicle.releasedAt;

    // Record History with Reversal Context
    this.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      vehicleId: vehicle.id,
      action: 'Port Release Undone',
      previousStatus,
      newStatus: 'AT PORT',
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      vesselName: vehicle.vesselName,
      timestamp: now,
      notes: reason || `Port release undone by ${actor.name} (previously marked released by ${releasedByNameBefore || 'officer'}). Returned to AT PORT.`,
    });

    // Audit Log
    this.logAudit({
      action: 'Port Release Undone',
      details: `Vehicle Serial #${vehicle.serialNumber} (${vehicle.chassisNumber} - ${vehicle.description}, Vessel: ${vehicle.vesselName || 'N/A'}) port release was reverted by ${actor.name}. Status returned from ON TRANSIT to AT PORT. ${reason ? 'Reason: ' + reason : ''}`,
      vehicleId: vehicle.id,
      chassisNumber: vehicle.chassisNumber,
      vesselName: vehicle.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true, vehicle: { ...vehicle } };
  }

  // Workflow Action 2: ON TRANSIT -> RECEIVED AT GALCO (GALCO Receiving User)
  public receiveAtGalco(
    vehicleId: string,
    actor: User,
    notes?: string
  ): { success: boolean; error?: string; vehicle?: Vehicle } {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found.' };
    }

    if (vehicle.status !== 'ON TRANSIT') {
      if (vehicle.status === 'AT PORT') {
        return {
          success: false,
          error: `Cannot receive vehicle directly! Vehicle (${vehicle.chassisNumber}, Vessel: ${vehicle.vesselName || 'N/A'}) is still AT PORT and has not yet been released.`,
        };
      }
      if (vehicle.status === 'RECEIVED AT GALCO') {
        return {
          success: false,
          error: `This vehicle (${vehicle.chassisNumber}, Vessel: ${vehicle.vesselName || 'N/A'}) has already been RECEIVED AT E27 on ${vehicle.receivedAt ? new Date(vehicle.receivedAt).toLocaleString() : 'earlier'}.`,
        };
      }
      return { success: false, error: 'Invalid action for current vehicle status.' };
    }

    const now = new Date().toISOString();
    const previousStatus = vehicle.status;
    vehicle.status = 'RECEIVED AT GALCO';
    vehicle.updatedAt = now;
    vehicle.receivedByUserId = actor.id;
    vehicle.receivedByName = actor.name;
    vehicle.receivedAt = now;

    // Record History with Vessel Context
    this.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      vehicleId: vehicle.id,
      action: 'Received at E27',
      previousStatus,
      newStatus: 'RECEIVED AT GALCO',
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      vesselName: vehicle.vesselName,
      timestamp: now,
      notes: notes || `Vehicle physically arrived and verified at E27 yard (Vessel: ${vehicle.vesselName || 'N/A'}).`,
    });

    // Audit Log
    this.logAudit({
      action: 'Vehicle Received at E27',
      details: `Vehicle Serial #${vehicle.serialNumber} (${vehicle.chassisNumber} - ${vehicle.description}, Vessel: ${vehicle.vesselName || 'N/A'}) received at E27 Yard. Status: RECEIVED AT GALCO.`,
      vehicleId: vehicle.id,
      chassisNumber: vehicle.chassisNumber,
      vesselName: vehicle.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true, vehicle: { ...vehicle } };
  }

  // Admin Override / Update Vehicle
  public adminUpdateVehicle(
    vehicleId: string,
    updates: {
      serialNumber?: number | string;
      chassisNumber?: string;
      description?: string;
      status?: VehicleStatus;
      vesselName?: string;
      voyageNumber?: string;
      notes?: string;
    },
    actor: User
  ): { success: boolean; error?: string; vehicle?: Vehicle } {
    const vehicle = this.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, error: 'Vehicle not found.' };
    }

    if (updates.chassisNumber && updates.chassisNumber !== vehicle.chassisNumber) {
      const existing = this.getVehicleByChassis(updates.chassisNumber);
      if (existing && existing.id !== vehicleId) {
        return {
          success: false,
          error: `Another vehicle with chassis number ${updates.chassisNumber} already exists in the system.`,
        };
      }
    }

    const previousStatus = vehicle.status;
    const now = new Date().toISOString();

    if (updates.serialNumber !== undefined) vehicle.serialNumber = updates.serialNumber;
    if (updates.chassisNumber !== undefined) vehicle.chassisNumber = updates.chassisNumber.trim().toUpperCase();
    if (updates.description !== undefined) vehicle.description = updates.description.trim();
    if (updates.vesselName !== undefined) vehicle.vesselName = updates.vesselName.trim().toUpperCase();
    if (updates.voyageNumber !== undefined) vehicle.voyageNumber = updates.voyageNumber.trim().toUpperCase();

    if (updates.status !== undefined && updates.status !== previousStatus) {
      vehicle.status = updates.status;
      if (updates.status === 'AT PORT') {
        vehicle.releasedAt = undefined;
        vehicle.releasedByName = undefined;
        vehicle.releasedByUserId = undefined;
        vehicle.receivedAt = undefined;
        vehicle.receivedByName = undefined;
        vehicle.receivedByUserId = undefined;
      } else if (updates.status === 'ON TRANSIT') {
        vehicle.releasedAt = vehicle.releasedAt || now;
        vehicle.releasedByName = vehicle.releasedByName || actor.name;
        vehicle.releasedByUserId = vehicle.releasedByUserId || actor.id;
        vehicle.receivedAt = undefined;
        vehicle.receivedByName = undefined;
        vehicle.receivedByUserId = undefined;
      } else if (updates.status === 'RECEIVED AT GALCO') {
        vehicle.releasedAt = vehicle.releasedAt || now;
        vehicle.releasedByName = vehicle.releasedByName || actor.name;
        vehicle.releasedByUserId = vehicle.releasedByUserId || actor.id;
        vehicle.receivedAt = vehicle.receivedAt || now;
        vehicle.receivedByName = vehicle.receivedByName || actor.name;
        vehicle.receivedByUserId = vehicle.receivedByUserId || actor.id;
      }

      this.history.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        vehicleId: vehicle.id,
        action: `Status Override (${previousStatus} -> ${updates.status})`,
        previousStatus,
        newStatus: updates.status,
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        vesselName: vehicle.vesselName,
        timestamp: now,
        notes: updates.notes || `Admin override performed by ${actor.name}`,
      });
    }

    vehicle.updatedAt = now;

    this.logAudit({
      action: 'Admin Vehicle Correction',
      details: `Admin ${actor.name} updated vehicle ${vehicle.chassisNumber} (Vessel: ${vehicle.vesselName || 'N/A'}). Notes: ${updates.notes || 'No notes'}`,
      vehicleId: vehicle.id,
      chassisNumber: vehicle.chassisNumber,
      vesselName: vehicle.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true, vehicle: { ...vehicle } };
  }

  // Admin Delete Vehicle
  public adminDeleteVehicle(
    vehicleId: string,
    actor: User
  ): { success: boolean; error?: string } {
    const idx = this.vehicles.findIndex((v) => v.id === vehicleId);
    if (idx === -1) {
      return { success: false, error: 'Vehicle not found.' };
    }

    const vehicle = this.vehicles[idx];
    this.vehicles.splice(idx, 1);
    this.history = this.history.filter((h) => h.vehicleId !== vehicleId);

    this.logAudit({
      action: 'Vehicle Deleted',
      details: `Admin ${actor.name} deleted vehicle ${vehicle.chassisNumber} (${vehicle.description}, Vessel: ${vehicle.vesselName || 'N/A'}, Serial #${vehicle.serialNumber}).`,
      vehicleId: vehicle.id,
      chassisNumber: vehicle.chassisNumber,
      vesselName: vehicle.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return { success: true };
  }

  // Manifest validation & import (Section 3 & Multi-Vessel Support)
  public validateManifestRows(
    rows: { serialNumber?: any; chassisNumber?: any; description?: any; vesselName?: any; voyageNumber?: any }[],
    defaultVessel?: string,
    defaultVoyage?: string
  ): {
    total: number;
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
    vesselName?: string;
    voyageNumber?: string;
    preview: {
      serialNumber: string | number;
      chassisNumber: string;
      description: string;
      vesselName?: string;
      voyageNumber?: string;
      isValid: boolean;
      isDuplicate: boolean;
      errorMessage?: string;
    }[];
  } {
    const seenChassisInFile = new Set<string>();
    const preview: any[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const serialNumber = row.serialNumber !== undefined && row.serialNumber !== null && String(row.serialNumber).trim() !== ''
        ? String(row.serialNumber).trim()
        : `${i + 1}`;
      const chassisNumber = (row.chassisNumber ? String(row.chassisNumber).trim().toUpperCase() : '');
      const description = (row.description && String(row.description).trim() ? String(row.description).trim() : 'N/A');
      const vesselName = (row.vesselName ? String(row.vesselName).trim().toUpperCase() : (defaultVessel ? defaultVessel.trim().toUpperCase() : undefined));
      const voyageNumber = (row.voyageNumber ? String(row.voyageNumber).trim().toUpperCase() : (defaultVoyage ? defaultVoyage.trim().toUpperCase() : undefined));

      let isValid = true;
      let isDuplicate = false;
      let errorMessage = '';

      if (!chassisNumber) {
        isValid = false;
        errorMessage = 'Missing chassis number';
      } else if (!serialNumber) {
        isValid = false;
        errorMessage = 'Missing serial number';
      } else if (seenChassisInFile.has(chassisNumber)) {
        isValid = false;
        isDuplicate = true;
        errorMessage = 'Duplicate chassis number in this file';
      } else if (this.getVehicleByChassis(chassisNumber)) {
        isValid = false;
        isDuplicate = true;
        errorMessage = 'Chassis number already exists in database';
      }

      if (isValid) {
        validCount++;
        seenChassisInFile.add(chassisNumber);
      } else if (isDuplicate) {
        duplicateCount++;
      } else {
        invalidCount++;
      }

      preview.push({
        serialNumber,
        chassisNumber,
        description,
        vesselName,
        voyageNumber,
        isValid,
        isDuplicate,
        errorMessage: errorMessage || undefined,
      });
    }

    return {
      total: rows.length,
      validCount,
      duplicateCount,
      invalidCount,
      vesselName: defaultVessel,
      voyageNumber: defaultVoyage,
      preview,
    };
  }

  public importManifest(
    fileName: string,
    validRows: { serialNumber: string | number; chassisNumber: string; description: string; vesselName?: string; voyageNumber?: string }[],
    actor: User,
    vesselMeta?: { vesselName?: string; voyageNumber?: string; portOfDischarge?: string; isVisibleInOperations?: boolean }
  ): { manifest: Manifest; vessel: MarineVessel; importedCount: number; createdVehicles: Vehicle[] } {
    const now = new Date().toISOString();
    const manifestId = `mnf-${Date.now()}`;

    const manifestVesselName = vesselMeta?.vesselName?.trim().toUpperCase() || 'UNASSIGNED VESSEL';
    const manifestVoyage = vesselMeta?.voyageNumber?.trim().toUpperCase() || 'VOY-GENERAL';
    const manifestPort = vesselMeta?.portOfDischarge || 'Dar es Salaam Port (TPA)';
    const initialVisibility = vesselMeta?.isVisibleInOperations !== undefined ? vesselMeta.isVisibleInOperations : true;

    let importedCount = 0;
    const newVehicles: Vehicle[] = [];
    for (const r of validRows) {
      const cleanChassis = r.chassisNumber.trim().toUpperCase();
      if (!cleanChassis || this.getVehicleByChassis(cleanChassis)) continue;

      const vehicleVessel = r.vesselName?.trim().toUpperCase() || manifestVesselName;
      const vehicleVoyage = r.voyageNumber?.trim().toUpperCase() || manifestVoyage;

      const vehicle: Vehicle = {
        id: `veh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        serialNumber: r.serialNumber || (this.vehicles.length + 1),
        chassisNumber: cleanChassis,
        description: r.description.trim(),
        status: 'AT PORT',
        vesselName: vehicleVessel,
        voyageNumber: vehicleVoyage,
        portOfDischarge: manifestPort,
        createdAt: now,
        updatedAt: now,
        manifestId,
      };

      this.vehicles.push(vehicle);
      newVehicles.push(vehicle);
      this.history.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        vehicleId: vehicle.id,
        action: 'Manifest Uploaded',
        previousStatus: 'NONE',
        newStatus: 'AT PORT',
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        vesselName: vehicleVessel,
        timestamp: now,
        notes: `Imported via manifest file ${fileName} (Vessel: ${vehicleVessel}, Voyage: ${vehicleVoyage})`,
      });
      importedCount++;
    }

    const manifestRecord: Manifest = {
      id: manifestId,
      fileName,
      uploadedByUserId: actor.id,
      uploadedByName: actor.name,
      uploadedAt: now,
      vesselName: manifestVesselName,
      voyageNumber: manifestVoyage,
      portOfDischarge: manifestPort,
      totalRecords: validRows.length,
      successfulRecords: importedCount,
      duplicateRecords: 0,
      invalidRecords: 0,
    };
    this.manifests.unshift(manifestRecord);

    // Auto-register vessel in vessels list if not already present
    let registeredVessel = this.vessels.find(
      (v) => v.name.toUpperCase() === manifestVesselName.toUpperCase()
    );
    if (!registeredVessel) {
      registeredVessel = {
        id: `vsl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: manifestVesselName,
        voyageNumber: manifestVoyage,
        portOfDischarge: manifestPort,
        status: 'ACTIVE',
        isVisibleInOperations: initialVisibility,
        createdAt: now,
        notes: `Auto-registered via manifest upload ${fileName}`,
      };
      this.vessels.unshift(registeredVessel);
    } else {
      // Ensure vessel is active and update visibility if specified
      registeredVessel.status = 'ACTIVE';
      if (vesselMeta?.isVisibleInOperations !== undefined) {
        registeredVessel.isVisibleInOperations = vesselMeta.isVisibleInOperations;
      }
      if (manifestVoyage && (!registeredVessel.voyageNumber || registeredVessel.voyageNumber === 'VOY-GENERAL')) {
        registeredVessel.voyageNumber = manifestVoyage;
      }
    }

    this.logAudit({
      action: 'Manifest Uploaded',
      details: `Admin ${actor.name} imported ${importedCount} vehicles from manifest ${fileName} for Vessel ${manifestVesselName} (${manifestVoyage}). Assigned status AT PORT. Operational Visibility: ${registeredVessel.isVisibleInOperations ? 'Enabled' : 'Hidden'}.`,
      vesselName: manifestVesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    this.saveToFile();

    return { manifest: manifestRecord, vessel: registeredVessel, importedCount, createdVehicles: newVehicles };
  }

  // Admin Delete Manifest and Rollback Associated Vehicles
  public adminDeleteManifest(manifestId: string, actor: User): { success: boolean; error?: string; removedCount?: number; manifest?: Manifest } {
    const manifestIdx = this.manifests.findIndex((m) => m.id === manifestId);
    if (manifestIdx === -1) {
      return { success: false, error: 'Manifest record not found.' };
    }

    const targetManifest = this.manifests[manifestIdx];

    // Find and delete all vehicles created under this manifest
    const vehiclesToRemove = this.vehicles.filter((v) => v.manifestId === manifestId);
    const vehicleIdsToRemove = new Set(vehiclesToRemove.map((v) => v.id));

    // Remove from vehicles pool
    this.vehicles = this.vehicles.filter((v) => !vehicleIdsToRemove.has(v.id));

    // Remove from history logs
    this.history = this.history.filter((h) => !vehicleIdsToRemove.has(h.vehicleId));

    // Remove manifest
    this.manifests.splice(manifestIdx, 1);

    // Audit log
    this.logAudit({
      action: 'Manifest Deleted (Rollback)',
      details: `Admin ${actor.name} deleted manifest "${targetManifest.fileName}" (${targetManifest.vesselName}, ${targetManifest.voyageNumber || 'N/A'}) and rolled back ${vehiclesToRemove.length} associated vehicle records.`,
      vesselName: targetManifest.vesselName,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return {
      success: true,
      removedCount: vehiclesToRemove.length,
      manifest: targetManifest,
    };
  }

  // --- Marine Vessel Operations & Visibility Management ---
  public getVessels(includeArchived: boolean = true): MarineVessel[] {
    // Return all vessels decorated with computed live statistics
    return this.vessels
      .filter((v) => includeArchived || v.status !== 'ARCHIVED')
      .map((vessel) => {
        const vesselVehicles = this.vehicles.filter(
          (veh) => veh.vesselName && veh.vesselName.toUpperCase() === vessel.name.toUpperCase()
        );
        const total = vesselVehicles.length;
        const atPort = vesselVehicles.filter((veh) => veh.status === 'AT PORT').length;
        const onTransit = vesselVehicles.filter((veh) => veh.status === 'ON TRANSIT').length;
        const received = vesselVehicles.filter((veh) => veh.status === 'RECEIVED AT GALCO').length;
        const completionRate = total > 0 ? Math.round((received / total) * 100) : 0;

        return {
          ...vessel,
          totalVehicles: total,
          atPortCount: atPort,
          onTransitCount: onTransit,
          receivedCount: received,
          completionRate,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getVisibleVessels(): MarineVessel[] {
    return this.getVessels(false).filter((v) => v.isVisibleInOperations);
  }

  public createVessel(
    data: { name: string; voyageNumber?: string; portOfDischarge?: string; notes?: string; isVisibleInOperations?: boolean },
    actor: User
  ): MarineVessel {
    const cleanName = data.name.trim().toUpperCase();
    const existing = this.vessels.find((v) => v.name.toUpperCase() === cleanName);
    if (existing) {
      existing.status = 'ACTIVE';
      existing.isVisibleInOperations = true;
      if (data.voyageNumber) existing.voyageNumber = data.voyageNumber.trim();
      if (data.portOfDischarge) existing.portOfDischarge = data.portOfDischarge.trim();
      return existing;
    }

    const newVessel: MarineVessel = {
      id: `vsl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: cleanName,
      voyageNumber: data.voyageNumber?.trim() || undefined,
      portOfDischarge: data.portOfDischarge?.trim() || 'Dar es Salaam Port (TPA)',
      status: 'ACTIVE',
      isVisibleInOperations: data.isVisibleInOperations !== undefined ? data.isVisibleInOperations : true,
      createdAt: new Date().toISOString(),
      notes: data.notes?.trim(),
    };

    this.vessels.unshift(newVessel);

    this.logAudit({
      action: 'Vessel Registered',
      details: `Admin ${actor.name} registered marine vessel ${newVessel.name} (Voyage: ${newVessel.voyageNumber || 'N/A'}).`,
      vesselName: newVessel.name,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return newVessel;
  }

  public updateVessel(
    id: string,
    updates: Partial<MarineVessel>,
    actor: User
  ): MarineVessel | null {
    const vessel = this.vessels.find((v) => v.id === id || v.name.toUpperCase() === id.toUpperCase());
    if (!vessel) return null;

    const oldStatus = vessel.status;
    const oldVisibility = vessel.isVisibleInOperations;

    if (updates.name !== undefined) vessel.name = updates.name.trim().toUpperCase();
    if (updates.voyageNumber !== undefined) vessel.voyageNumber = updates.voyageNumber.trim();
    if (updates.portOfDischarge !== undefined) vessel.portOfDischarge = updates.portOfDischarge.trim();
    if (updates.notes !== undefined) vessel.notes = updates.notes.trim();
    if (updates.isVisibleInOperations !== undefined) vessel.isVisibleInOperations = updates.isVisibleInOperations;
    if (updates.status !== undefined) {
      vessel.status = updates.status;
      if (updates.status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        vessel.completedAt = new Date().toISOString();
      } else if (updates.status === 'ACTIVE') {
        vessel.completedAt = undefined;
      }
    }

    this.logAudit({
      action: 'Vessel Updated',
      details: `Admin ${actor.name} updated vessel ${vessel.name}: Status (${oldStatus} -> ${vessel.status}), Visibility (${oldVisibility} -> ${vessel.isVisibleInOperations})`,
      vesselName: vessel.name,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return vessel;
  }

  public deleteVessel(id: string, actor: User): boolean {
    const idx = this.vessels.findIndex((v) => v.id === id);
    if (idx === -1) return false;

    const vessel = this.vessels[idx];
    this.vessels.splice(idx, 1);

    this.logAudit({
      action: 'Vessel Removed',
      details: `Admin ${actor.name} removed marine vessel record ${vessel.name}. (All historical vehicle transfers preserved).`,
      vesselName: vessel.name,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return true;
  }

  public bulkSetVesselsVisibility(visibleVesselNames: string[], actor: User): MarineVessel[] {
    const upperVisible = new Set(visibleVesselNames.map((n) => n.trim().toUpperCase()));
    for (const v of this.vessels) {
      v.isVisibleInOperations = upperVisible.has(v.name.toUpperCase());
    }

    this.logAudit({
      action: 'Vessel Visibility Filter Updated',
      details: `Admin ${actor.name} updated operational vessel display filter. Active vessels: ${visibleVesselNames.join(', ') || 'None'}`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    return this.getVessels();
  }

  // Vehicle History
  public getVehicleHistory(vehicleId: string): VehicleHistoryItem[] {
    return this.history
      .filter((h) => h.vehicleId === vehicleId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const entry: AuditLog = {
      ...log,
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveToFile();
  }

  // Manifest list
  public getManifests(): Manifest[] {
    return [...this.manifests];
  }

  // Statistics & Visualization data with Vessel Breakdown
  public getDashboardStats(vesselFilter?: string): any {
    let pool = this.vehicles;
    if (vesselFilter && vesselFilter !== 'ALL') {
      pool = pool.filter((v) => v.vesselName && v.vesselName.toUpperCase() === vesselFilter.toUpperCase());
    }

    const total = pool.length;
    const atPort = pool.filter((v) => v.status === 'AT PORT').length;
    const onTransit = pool.filter((v) => v.status === 'ON TRANSIT').length;
    const received = pool.filter((v) => v.status === 'RECEIVED AT GALCO').length;

    const todayDateStr = new Date().toISOString().split('T')[0];

    const releasedToday = pool.filter(
      (v) => v.releasedAt && v.releasedAt.startsWith(todayDateStr)
    ).length;

    const receivedToday = pool.filter(
      (v) => v.receivedAt && v.receivedAt.startsWith(todayDateStr)
    ).length;

    // Per Vessel breakdown
    const vesselMap = new Map<string, { total: number; atPort: number; onTransit: number; received: number; voyage?: string }>();
    for (const v of this.vehicles) {
      const vName = v.vesselName || 'GENERAL INTAKE';
      if (!vesselMap.has(vName)) {
        vesselMap.set(vName, { total: 0, atPort: 0, onTransit: 0, received: 0, voyage: v.voyageNumber });
      }
      const stat = vesselMap.get(vName)!;
      stat.total++;
      if (v.status === 'AT PORT') stat.atPort++;
      else if (v.status === 'ON TRANSIT') stat.onTransit++;
      else if (v.status === 'RECEIVED AT GALCO') stat.received++;
      if (!stat.voyage && v.voyageNumber) stat.voyage = v.voyageNumber;
    }

    const vesselStats = Array.from(vesselMap.entries()).map(([name, data]) => ({
      vesselName: name,
      voyageNumber: data.voyage,
      total: data.total,
      atPort: data.atPort,
      onTransit: data.onTransit,
      received: data.received,
      completionRate: data.total > 0 ? Math.round((data.received / data.total) * 100) : 0,
    }));

    // Last 7 days activity trend
    const days: { [key: string]: { date: string; released: number; received: number; imported: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[dateKey] = { date: displayKey, released: 0, received: 0, imported: 0 };
    }

    for (const h of this.history) {
      const dKey = h.timestamp.split('T')[0];
      if (days[dKey]) {
        if (h.action.includes('Released')) days[dKey].released++;
        else if (h.action.includes('Received')) days[dKey].received++;
        else if (h.action.includes('Manifest')) days[dKey].imported++;
      }
    }

    const activityByDay = Object.values(days);

    const statusDistribution = [
      { name: 'AT PORT', value: atPort, color: '#f59e0b' },
      { name: 'ON TRANSIT', value: onTransit, color: '#f97316' },
      { name: 'RECEIVED AT GALCO', value: received, color: '#10b981' },
    ];

    return {
      totalVehicles: total,
      atPortCount: atPort,
      onTransitCount: onTransit,
      receivedGalcoCount: received,
      releasedTodayCount: releasedToday,
      receivedTodayCount: receivedToday,
      totalManifests: this.manifests.length,
      activeUsersCount: this.users.filter((u) => u.status === 'ACTIVE').length,
      vesselsCount: vesselStats.length,
      vesselStats,
      activityByDay,
      statusDistribution,
    };
  }

  public clearAllOperationalData(actor: User): { success: boolean; cleared: { vehicles: number; manifests: number; history: number; vessels: number } } {
    const counts = {
      vehicles: this.vehicles.length,
      manifests: this.manifests.length,
      history: this.history.length,
      vessels: this.vessels.length,
    };
    this.vehicles = [];
    this.history = [];
    this.manifests = [];
    this.vessels = [];
    this.auditLogs = [];

    this.logAudit({
      action: 'Operational Data Purged & Cleared',
      details: `Admin ${actor.name} cleared all vehicles, manifests, vessels, and tracking history for new manifest upload.`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
    });

    this.saveToFile();
    return { success: true, cleared: counts };
  }
}

export const db = new Database();
