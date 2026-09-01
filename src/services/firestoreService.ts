import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Vehicle, VehicleHistoryItem, Manifest, AuditLog, User, MarineVessel } from '../types';

export class FirestoreService {
  // --- VEHICLES ---
  static async setVehicle(vehicle: Vehicle): Promise<void> {
    const path = `vehicles/${vehicle.id}`;
    try {
      // Clean undefined fields for Firestore
      const payload: any = {
        id: vehicle.id,
        serialNumber: String(vehicle.serialNumber || ''),
        chassisNumber: (vehicle.chassisNumber || '').trim().toUpperCase(),
        description: (vehicle.description || 'N/A').trim(),
        status: vehicle.status || 'AT PORT',
        createdAt: vehicle.createdAt || new Date().toISOString(),
        updatedAt: vehicle.updatedAt || new Date().toISOString(),
      };
      if (vehicle.manifestId) payload.manifestId = vehicle.manifestId;
      if (vehicle.vesselName) payload.vesselName = vehicle.vesselName;
      if (vehicle.voyageNumber) payload.voyageNumber = vehicle.voyageNumber;
      if (vehicle.portOfDischarge) payload.portOfDischarge = vehicle.portOfDischarge;
      if (vehicle.releasedByUserId) payload.releasedByUserId = vehicle.releasedByUserId;
      if (vehicle.releasedByName) payload.releasedByName = vehicle.releasedByName;
      if (vehicle.releasedAt) payload.releasedAt = vehicle.releasedAt;
      if (vehicle.receivedByUserId) payload.receivedByUserId = vehicle.receivedByUserId;
      if (vehicle.receivedByName) payload.receivedByName = vehicle.receivedByName;
      if (vehicle.receivedAt) payload.receivedAt = vehicle.receivedAt;

      await setDoc(doc(db, 'vehicles', vehicle.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  static async batchSetVehicles(vehicles: Vehicle[]): Promise<void> {
    if (!vehicles || vehicles.length === 0) return;
    for (let i = 0; i < vehicles.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = vehicles.slice(i, i + 450);
      for (const vehicle of chunk) {
        const ref = doc(db, 'vehicles', vehicle.id);
        const payload: any = {
          id: vehicle.id,
          serialNumber: String(vehicle.serialNumber || ''),
          chassisNumber: (vehicle.chassisNumber || '').trim().toUpperCase(),
          description: (vehicle.description || 'N/A').trim(),
          status: vehicle.status || 'AT PORT',
          createdAt: vehicle.createdAt || new Date().toISOString(),
          updatedAt: vehicle.updatedAt || new Date().toISOString(),
        };
        if (vehicle.manifestId) payload.manifestId = vehicle.manifestId;
        if (vehicle.vesselName) payload.vesselName = vehicle.vesselName;
        if (vehicle.voyageNumber) payload.voyageNumber = vehicle.voyageNumber;
        if (vehicle.portOfDischarge) payload.portOfDischarge = vehicle.portOfDischarge;
        if (vehicle.releasedByUserId) payload.releasedByUserId = vehicle.releasedByUserId;
        if (vehicle.releasedByName) payload.releasedByName = vehicle.releasedByName;
        if (vehicle.releasedAt) payload.releasedAt = vehicle.releasedAt;
        if (vehicle.receivedByUserId) payload.receivedByUserId = vehicle.receivedByUserId;
        if (vehicle.receivedByName) payload.receivedByName = vehicle.receivedByName;
        if (vehicle.receivedAt) payload.receivedAt = vehicle.receivedAt;
        batch.set(ref, payload);
      }
      await batch.commit();
    }
  }

  static async removeVehicle(vehicleId: string): Promise<void> {
    const path = `vehicles/${vehicleId}`;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  static async removeVehiclesByManifestId(manifestId: string): Promise<void> {
    try {
      const q = query(collection(db, 'vehicles'), where('manifestId', '==', manifestId));
      const snap = await getDocs(q);
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 450);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('[FirestoreService] removeVehiclesByManifestId error:', err);
    }
  }

  static async removeVehiclesByVessel(vesselName: string): Promise<void> {
    try {
      const q = query(collection(db, 'vehicles'), where('vesselName', '==', vesselName));
      const snap = await getDocs(q);
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 450);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('[FirestoreService] removeVehiclesByVessel error:', err);
    }
  }

  static subscribeVehicles(onData: (vehicles: Vehicle[]) => void): () => void {
    const path = 'vehicles';
    const q = collection(db, path);
    return onSnapshot(
      q,
      (snapshot) => {
        const vehicles: Vehicle[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          vehicles.push({
            id: d.id || docSnap.id,
            serialNumber: d.serialNumber,
            chassisNumber: d.chassisNumber,
            description: d.description,
            status: d.status,
            vesselName: d.vesselName,
            voyageNumber: d.voyageNumber,
            portOfDischarge: d.portOfDischarge,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            manifestId: d.manifestId,
            releasedByUserId: d.releasedByUserId,
            releasedByName: d.releasedByName,
            releasedAt: d.releasedAt,
            receivedByUserId: d.receivedByUserId,
            receivedByName: d.receivedByName,
            receivedAt: d.receivedAt,
          });
        });
        vehicles.sort((a, b) => {
          const sA = Number(a.serialNumber) || 0;
          const sB = Number(b.serialNumber) || 0;
          return sA - sB;
        });
        onData(vehicles);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // --- VEHICLE HISTORY ---
  static async addVehicleHistory(item: VehicleHistoryItem): Promise<void> {
    const path = `vehicles/${item.vehicleId}/history/${item.id}`;
    try {
      const payload: any = {
        id: item.id,
        vehicleId: item.vehicleId,
        action: item.action,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
        userId: item.userId,
        userName: item.userName,
        userRole: item.userRole,
        timestamp: item.timestamp,
      };
      if (item.notes) payload.notes = item.notes;

      // Write to subcollection and flat history
      await setDoc(doc(db, 'vehicles', item.vehicleId, 'history', item.id), payload);
      await setDoc(doc(db, 'vehicle_history', item.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // --- MANIFESTS ---
  static async setManifest(manifest: Manifest): Promise<void> {
    const path = `manifests/${manifest.id}`;
    try {
      await setDoc(doc(db, 'manifests', manifest.id), {
        id: manifest.id,
        fileName: manifest.fileName,
        uploadedByUserId: manifest.uploadedByUserId,
        uploadedByName: manifest.uploadedByName,
        uploadedAt: manifest.uploadedAt,
        totalRecords: manifest.totalRecords,
        successfulRecords: manifest.successfulRecords,
        duplicateRecords: manifest.duplicateRecords || 0,
        invalidRecords: manifest.invalidRecords || 0,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  static async removeManifest(manifestId: string): Promise<void> {
    const path = `manifests/${manifestId}`;
    try {
      await deleteDoc(doc(db, 'manifests', manifestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  static subscribeManifests(onData: (manifests: Manifest[]) => void): () => void {
    const path = 'manifests';
    const q = collection(db, path);
    return onSnapshot(
      q,
      (snapshot) => {
        const manifests: Manifest[] = [];
        snapshot.forEach((docSnap) => {
          manifests.push(docSnap.data() as Manifest);
        });
        manifests.sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        onData(manifests);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // --- MARINE VESSELS ---
  static async setVessel(vessel: MarineVessel): Promise<void> {
    const path = `marine_vessels/${vessel.id}`;
    try {
      const payload: any = {
        id: vessel.id,
        name: vessel.name.toUpperCase(),
        status: vessel.status,
        isVisibleInOperations: vessel.isVisibleInOperations,
        createdAt: vessel.createdAt,
      };
      if (vessel.voyageNumber) payload.voyageNumber = vessel.voyageNumber;
      if (vessel.portOfDischarge) payload.portOfDischarge = vessel.portOfDischarge;
      if (vessel.completedAt) payload.completedAt = vessel.completedAt;
      if (vessel.notes) payload.notes = vessel.notes;

      await setDoc(doc(db, 'marine_vessels', vessel.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  static async removeVessel(vesselId: string): Promise<void> {
    const path = `marine_vessels/${vesselId}`;
    try {
      await deleteDoc(doc(db, 'marine_vessels', vesselId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  static subscribeVessels(onData: (vessels: MarineVessel[]) => void): () => void {
    const path = 'marine_vessels';
    const q = collection(db, path);
    return onSnapshot(
      q,
      (snapshot) => {
        const vessels: MarineVessel[] = [];
        snapshot.forEach((docSnap) => {
          vessels.push(docSnap.data() as MarineVessel);
        });
        vessels.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onData(vessels);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // --- AUDIT LOGS ---
  static async addAuditLog(log: AuditLog): Promise<void> {
    const path = `audit_logs/${log.id}`;
    try {
      const payload: any = {
        id: log.id,
        action: log.action,
        details: log.details,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        timestamp: log.timestamp,
      };
      if (log.vehicleId) payload.vehicleId = log.vehicleId;
      if (log.chassisNumber) payload.chassisNumber = log.chassisNumber;

      await setDoc(doc(db, 'audit_logs', log.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  static subscribeAuditLogs(onData: (logs: AuditLog[]) => void): () => void {
    const path = 'audit_logs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as AuditLog);
        });
        onData(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // --- USERS ---
  static async setUser(user: User): Promise<void> {
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  static async removeUser(userId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  static subscribeUsers(onData: (users: User[]) => void): () => void {
    const path = 'users';
    const q = collection(db, path);
    return onSnapshot(
      q,
      (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data() as User);
        });
        onData(users);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  // Clear all operational data (vehicles, manifests, vehicle history, marine vessels, audit logs)
  static async clearAllOperationalData(): Promise<void> {
    const collectionsToClear = [
      'vehicles',
      'manifests',
      'vehicle_history',
      'marine_vessels',
      'audit_logs',
    ];
    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 450);
          for (const d of chunk) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }
      } catch (err) {
        console.warn(`[FirestoreService] Could not clear collection ${colName}:`, err);
      }
    }
  }

  // Initial Sync from server DB to Firestore if Firestore is empty
  static async initializeFirestoreWithDefaults(serverVehicles: Vehicle[], serverManifests: Manifest[], serverUsers: User[], serverLogs: AuditLog[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'vehicles'));
      if (snap.empty && serverVehicles.length > 0) {
        console.log('[Firebase] Seeding initial data into Firestore...');
        for (const u of serverUsers) {
          await this.setUser(u);
        }
        for (const m of serverManifests) {
          await this.setManifest(m);
        }
        for (const v of serverVehicles) {
          await this.setVehicle(v);
        }
        for (const l of serverLogs) {
          await this.addAuditLog(l);
        }
        console.log('[Firebase] Initial Firestore seeding complete.');
      }
    } catch (err) {
      console.warn('[Firebase] Initial check/seed error:', err);
    }
  }
}
