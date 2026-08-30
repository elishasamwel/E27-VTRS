import { User, Vehicle, VehicleHistoryItem, Manifest, AuditLog, VehicleStatus, MarineVessel } from '../src/types';

// In-memory persistent database store with initial demo data
class Database {
  private users: User[] = [];
  private userPasswords: Map<string, string> = new Map(); // id -> password
  private vehicles: Vehicle[] = [];
  private history: VehicleHistoryItem[] = [];
  private manifests: Manifest[] = [];
  private auditLogs: AuditLog[] = [];
  private vessels: MarineVessel[] = [];

  constructor() {
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
    const yesterdayIso = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const twoDaysAgoIso = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();

    // 0. Registered Marine Vessels
    const vessel1: MarineVessel = {
      id: 'vsl-mv-trans-carrier',
      name: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      status: 'ACTIVE',
      isVisibleInOperations: true,
      createdAt: twoDaysAgoIso,
      notes: 'Active port discharge and transport operation in progress.',
    };

    const vessel2: MarineVessel = {
      id: 'vsl-mv-pacific-glory',
      name: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      status: 'ACTIVE',
      isVisibleInOperations: true,
      createdAt: yesterdayIso,
      notes: 'Active port transfer operations.',
    };

    this.vessels = [vessel1, vessel2].filter((v) => v.name.toUpperCase() !== 'E27' && v.id !== 'e27');

    // 1. Initial Users
    const adminUser: User = {
      id: 'usr-admin-1',
      name: 'Elisha Samwel',
      email: 'admin@galco.co.tz',
      username: 'admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: twoDaysAgoIso,
      lastLogin: todayIso,
    };
    this.users.push(adminUser);
    this.userPasswords.set(adminUser.id, 'admin123');

    const portUser: User = {
      id: 'usr-port-1',
      name: 'John Mrosso (TPA Port)',
      email: 'port@galco.co.tz',
      username: 'port_officer',
      role: 'PORT_RELEASE',
      status: 'ACTIVE',
      createdAt: twoDaysAgoIso,
      lastLogin: todayIso,
    };
    this.users.push(portUser);
    this.userPasswords.set(portUser.id, 'port123');

    const galcoUser: User = {
      id: 'usr-galco-1',
      name: 'Hamis Bakari (E27 Yard)',
      email: 'yard@galco.co.tz',
      username: 'galco_receiver',
      role: 'GALCO_RECEIVING',
      status: 'ACTIVE',
      createdAt: twoDaysAgoIso,
      lastLogin: todayIso,
    };
    this.users.push(galcoUser);
    this.userPasswords.set(galcoUser.id, 'yard123');

    // 2. Demo Manifest
    // 2. Demo Manifests (Separate for different marine vessels)
    const manifest1: Manifest = {
      id: 'mnf-vessel-001',
      fileName: 'TPA_DAR_MANIFEST_MV_TRANS_CARRIER.xlsx',
      uploadedByUserId: adminUser.id,
      uploadedByName: adminUser.name,
      uploadedAt: twoDaysAgoIso,
      vesselName: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      totalRecords: 4,
      successfulRecords: 4,
      duplicateRecords: 0,
      invalidRecords: 0,
    };
    const manifest2: Manifest = {
      id: 'mnf-vessel-002',
      fileName: 'TPA_DAR_MANIFEST_MV_PACIFIC_GLORY.xlsx',
      uploadedByUserId: adminUser.id,
      uploadedByName: adminUser.name,
      uploadedAt: yesterdayIso,
      vesselName: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      totalRecords: 4,
      successfulRecords: 4,
      duplicateRecords: 0,
      invalidRecords: 0,
    };
    this.manifests.push(manifest1, manifest2);

    // 3. Demo Vehicles - Vessel 1: MV TRANS CARRIER
    // Vehicle 1: KEEFW108999 (MAZDA CX) -> AT PORT (MV TRANS CARRIER)
    const v1: Vehicle = {
      id: 'veh-1',
      serialNumber: 1,
      chassisNumber: 'KEEFW108999',
      description: 'MAZDA CX-5 2.0L SKYACTIV 2018',
      status: 'AT PORT',
      vesselName: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: twoDaysAgoIso,
      updatedAt: twoDaysAgoIso,
      manifestId: manifest1.id,
    };
    this.vehicles.push(v1);
    this.history.push({
      id: 'hist-1-1',
      vehicleId: v1.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: twoDaysAgoIso,
      notes: 'Initial batch upload from manifest: MV TRANS CARRIER (VOY-2026/08)',
    });

    // Vehicle 2: JH4TB2H26CC000123 (HONDA CR-V) -> ON TRANSIT (MV TRANS CARRIER)
    const v2: Vehicle = {
      id: 'veh-2',
      serialNumber: 2,
      chassisNumber: 'JH4TB2H26CC000123',
      description: 'HONDA CR-V 4WD PEARL WHITE 2019',
      status: 'ON TRANSIT',
      vesselName: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: twoDaysAgoIso,
      updatedAt: yesterdayIso,
      manifestId: manifest1.id,
      releasedByUserId: portUser.id,
      releasedByName: portUser.name,
      releasedAt: yesterdayIso,
    };
    this.vehicles.push(v2);
    this.history.push({
      id: 'hist-2-1',
      vehicleId: v2.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: twoDaysAgoIso,
      notes: 'Imported via manifest file for MV TRANS CARRIER',
    });
    this.history.push({
      id: 'hist-2-2',
      vehicleId: v2.id,
      action: 'Released from Port',
      previousStatus: 'AT PORT',
      newStatus: 'ON TRANSIT',
      userId: portUser.id,
      userName: portUser.name,
      userRole: portUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: yesterdayIso,
      notes: 'Physical verification passed. Carrier dispatched from Port berth to E27 yard.',
    });

    // Vehicle 3: KMHFG4JG5GA123456 (HYUNDAI) -> RECEIVED AT GALCO (MV TRANS CARRIER)
    const v3: Vehicle = {
      id: 'veh-3',
      serialNumber: 3,
      chassisNumber: 'KMHFG4JG5GA123456',
      description: 'HYUNDAI TUCSON 2.0 CRDI DIESEL 2020',
      status: 'RECEIVED AT GALCO',
      vesselName: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: twoDaysAgoIso,
      updatedAt: todayIso,
      manifestId: manifest1.id,
      releasedByUserId: portUser.id,
      releasedByName: portUser.name,
      releasedAt: yesterdayIso,
      receivedByUserId: galcoUser.id,
      receivedByName: galcoUser.name,
      receivedAt: todayIso,
    };
    this.vehicles.push(v3);
    this.history.push({
      id: 'hist-3-1',
      vehicleId: v3.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: twoDaysAgoIso,
    });
    this.history.push({
      id: 'hist-3-2',
      vehicleId: v3.id,
      action: 'Released from Port',
      previousStatus: 'AT PORT',
      newStatus: 'ON TRANSIT',
      userId: portUser.id,
      userName: portUser.name,
      userRole: portUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: yesterdayIso,
    });
    this.history.push({
      id: 'hist-3-3',
      vehicleId: v3.id,
      action: 'Received at E27',
      previousStatus: 'ON TRANSIT',
      newStatus: 'RECEIVED AT GALCO',
      userId: galcoUser.id,
      userName: galcoUser.name,
      userRole: galcoUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: todayIso,
      notes: 'Vehicle from MV TRANS CARRIER received and parked at Bay A-14. Physical inspection complete.',
    });

    // Vehicle 4: NZE141-9081234 (TOYOTA COROLLA FIELDER) -> AT PORT (MV TRANS CARRIER)
    const v4: Vehicle = {
      id: 'veh-4',
      serialNumber: 4,
      chassisNumber: 'NZE141-9081234',
      description: 'TOYOTA COROLLA FIELDER 1.5X SILVER 2017',
      status: 'AT PORT',
      vesselName: 'MV TRANS CARRIER',
      voyageNumber: 'VOY-2026/08',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: twoDaysAgoIso,
      updatedAt: twoDaysAgoIso,
      manifestId: manifest1.id,
    };
    this.vehicles.push(v4);
    this.history.push({
      id: 'hist-4-1',
      vehicleId: v4.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV TRANS CARRIER',
      timestamp: twoDaysAgoIso,
    });

    // Demo Vehicles - Vessel 2: MV PACIFIC GLORY
    // Vehicle 5: WBA3A5C55FP778899 (BMW 320I) -> ON TRANSIT (MV PACIFIC GLORY)
    const v5: Vehicle = {
      id: 'veh-5',
      serialNumber: 5,
      chassisNumber: 'WBA3A5C55FP778899',
      description: 'BMW 320I M-SPORT BLACK SAPPHIRE 2021',
      status: 'ON TRANSIT',
      vesselName: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: yesterdayIso,
      updatedAt: todayIso,
      manifestId: manifest2.id,
      releasedByUserId: portUser.id,
      releasedByName: portUser.name,
      releasedAt: todayIso,
    };
    this.vehicles.push(v5);
    this.history.push({
      id: 'hist-5-1',
      vehicleId: v5.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: yesterdayIso,
    });
    this.history.push({
      id: 'hist-5-2',
      vehicleId: v5.id,
      action: 'Released from Port',
      previousStatus: 'AT PORT',
      newStatus: 'ON TRANSIT',
      userId: portUser.id,
      userName: portUser.name,
      userRole: portUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: todayIso,
      notes: 'Car from MV PACIFIC GLORY released and escorted to E27 yard.',
    });

    // Vehicle 6: VNKKL832960554433 (MERCEDES-BENZ C200) -> RECEIVED AT GALCO (MV PACIFIC GLORY)
    const v6: Vehicle = {
      id: 'veh-6',
      serialNumber: 6,
      chassisNumber: 'VNKKL832960554433',
      description: 'MERCEDES-BENZ C200 AVANTGARDE OBSIDIAN BLACK 2020',
      status: 'RECEIVED AT GALCO',
      vesselName: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: yesterdayIso,
      updatedAt: todayIso,
      manifestId: manifest2.id,
      releasedByUserId: portUser.id,
      releasedByName: portUser.name,
      releasedAt: yesterdayIso,
      receivedByUserId: galcoUser.id,
      receivedByName: galcoUser.name,
      receivedAt: todayIso,
    };
    this.vehicles.push(v6);
    this.history.push({
      id: 'hist-6-1',
      vehicleId: v6.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: yesterdayIso,
    });
    this.history.push({
      id: 'hist-6-2',
      vehicleId: v6.id,
      action: 'Released from Port',
      previousStatus: 'AT PORT',
      newStatus: 'ON TRANSIT',
      userId: portUser.id,
      userName: portUser.name,
      userRole: portUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: yesterdayIso,
    });
    this.history.push({
      id: 'hist-6-3',
      vehicleId: v6.id,
      action: 'Received at E27',
      previousStatus: 'ON TRANSIT',
      newStatus: 'RECEIVED AT GALCO',
      userId: galcoUser.id,
      userName: galcoUser.name,
      userRole: galcoUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: todayIso,
      notes: 'Car from MV PACIFIC GLORY cleared gate entry checklist and assigned to Bay B-08.',
    });

    // Vehicle 7: JTMBA31V105234987 (TOYOTA LAND CRUISER PRADO) -> AT PORT (MV PACIFIC GLORY)
    const v7: Vehicle = {
      id: 'veh-7',
      serialNumber: 7,
      chassisNumber: 'JTMBA31V105234987',
      description: 'TOYOTA LAND CRUISER PRADO TX-L PEARL 2022',
      status: 'AT PORT',
      vesselName: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
      manifestId: manifest2.id,
    };
    this.vehicles.push(v7);
    this.history.push({
      id: 'hist-7-1',
      vehicleId: v7.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: yesterdayIso,
    });

    // Vehicle 8: SALWR2V45KA998877 (RANGE ROVER SPORT) -> AT PORT (MV PACIFIC GLORY)
    const v8: Vehicle = {
      id: 'veh-8',
      serialNumber: 8,
      chassisNumber: 'SALWR2V45KA998877',
      description: 'RANGE ROVER SPORT HSE DYNAMIC SANTORINI BLACK 2021',
      status: 'AT PORT',
      vesselName: 'MV PACIFIC GLORY',
      voyageNumber: 'VOY-2026/04',
      portOfDischarge: 'Dar es Salaam Port (TPA)',
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
      manifestId: manifest2.id,
    };
    this.vehicles.push(v8);
    this.history.push({
      id: 'hist-8-1',
      vehicleId: v8.id,
      action: 'Manifest Uploaded',
      previousStatus: 'NONE',
      newStatus: 'AT PORT',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      vesselName: 'MV PACIFIC GLORY',
      timestamp: yesterdayIso,
    });

    // Initial Audit Logs
    this.auditLogs.push({
      id: 'aud-1',
      action: 'System Initialized',
      details: 'E27 VTMS Vehicle Transfer Management System initialized with base manifest.',
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      timestamp: twoDaysAgoIso,
    });
    this.auditLogs.push({
      id: 'aud-2',
      action: 'Manifest Uploaded',
      details: `Imported 4 vehicles from ${manifest1.fileName} for ${manifest1.vesselName}`,
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      timestamp: twoDaysAgoIso,
    });
    this.auditLogs.push({
      id: 'aud-3',
      action: 'Vehicle Released from Port',
      details: `Vehicle ${v2.chassisNumber} (${v2.description}) released from Dar es Salaam Port (TPA) to ON TRANSIT`,
      vehicleId: v2.id,
      chassisNumber: v2.chassisNumber,
      userId: portUser.id,
      userName: portUser.name,
      userRole: portUser.role,
      timestamp: yesterdayIso,
    });
    this.auditLogs.push({
      id: 'aud-4',
      action: 'Vehicle Received at E27',
      details: `Vehicle ${v3.chassisNumber} (${v3.description}) received at E27 Yard`,
      vehicleId: v3.id,
      chassisNumber: v3.chassisNumber,
      userId: galcoUser.id,
      userName: galcoUser.name,
      userRole: galcoUser.role,
      timestamp: todayIso,
    });
  }

  // User methods
  public authenticate(identifier: string, passwordAttempt: string): User | null {
    const cleanId = identifier.trim().toLowerCase();
    const user = this.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );
    if (!user || user.status !== 'ACTIVE') return null;

    const storedPass = this.userPasswords.get(user.id);
    if (storedPass === passwordAttempt) {
      user.lastLogin = new Date().toISOString();
      this.logAudit({
        action: 'User Logged In',
        details: `User ${user.name} logged in successfully as ${user.role}.`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
      });
      return { ...user };
    }
    return null;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>, password: string, actor: User): User {
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.userPasswords.set(newUser.id, password || 'galco123');

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
      const visibleVesselNames = new Set(
        this.vessels
          .filter((v) => v.isVisibleInOperations)
          .map((v) => v.name.toUpperCase())
      );
      result = result.filter((v) => {
        if (!v.vesselName) return true;
        return visibleVesselNames.has(v.vesselName.toUpperCase());
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
          v.chassisNumber.toUpperCase().includes(q) ||
          v.description.toUpperCase().includes(q) ||
          String(v.serialNumber).includes(q) ||
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
      const chassis = v.chassisNumber.trim().toUpperCase();
      const desc = v.description.trim().toUpperCase();
      const serial = String(v.serialNumber).toUpperCase();
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
      const serialNumber = row.serialNumber !== undefined && row.serialNumber !== null ? String(row.serialNumber).trim() : `${i + 1}`;
      const chassisNumber = (row.chassisNumber ? String(row.chassisNumber).trim().toUpperCase() : '');
      const description = (row.description ? String(row.description).trim() : '');
      const vesselName = (row.vesselName ? String(row.vesselName).trim().toUpperCase() : (defaultVessel ? defaultVessel.trim().toUpperCase() : undefined));
      const voyageNumber = (row.voyageNumber ? String(row.voyageNumber).trim().toUpperCase() : (defaultVoyage ? defaultVoyage.trim().toUpperCase() : undefined));

      let isValid = true;
      let isDuplicate = false;
      let errorMessage = '';

      if (!chassisNumber) {
        isValid = false;
        errorMessage = 'Missing chassis number';
      } else if (!description) {
        isValid = false;
        errorMessage = 'Missing vehicle description';
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
  ): { manifest: Manifest; vessel: MarineVessel; importedCount: number } {
    const now = new Date().toISOString();
    const manifestId = `mnf-${Date.now()}`;

    const manifestVesselName = vesselMeta?.vesselName?.trim().toUpperCase() || 'UNASSIGNED VESSEL';
    const manifestVoyage = vesselMeta?.voyageNumber?.trim().toUpperCase() || 'VOY-GENERAL';
    const manifestPort = vesselMeta?.portOfDischarge || 'Dar es Salaam Port (TPA)';
    const initialVisibility = vesselMeta?.isVisibleInOperations !== undefined ? vesselMeta.isVisibleInOperations : true;

    let importedCount = 0;
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

    return { manifest: manifestRecord, vessel: registeredVessel, importedCount };
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
}

export const db = new Database();
