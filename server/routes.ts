import { Router, Request, Response } from 'express';
import { db } from './db';
import { User, VehicleStatus } from '../src/types';

export const apiRouter = Router();

// Helper to extract actor from headers or default to session user
function getActor(req: Request): User {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = db.getUserById(userId);
    if (user && user.status === 'ACTIVE') return user;
  }
  // Fallback to default admin for unauthenticated dev requests
  return db.getUsers().find((u) => u.role === 'ADMIN') || db.getUsers()[0];
}

// 1. Auth routes
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  const user = db.authenticate(identifier, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
  }

  res.json({ user, token: `token-${user.id}-${Date.now()}` });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const actor = getActor(req);
  res.json({ user: actor });
});

// 2. Vehicles routes
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  const actor = getActor(req);
  const { status, search, vesselName, startDate, endDate, operationalOnly } = req.query;
  const vehicles = db.getVehicles(
    {
      status: (status as VehicleStatus | 'ALL') || 'ALL',
      search: (search as string) || undefined,
      vesselName: (vesselName as string) || undefined,
      startDate: (startDate as string) || undefined,
      endDate: (endDate as string) || undefined,
      operationalOnly: operationalOnly === 'true',
    },
    actor
  );
  res.json({ vehicles, total: vehicles.length });
});

apiRouter.get('/vehicles/search', (req: Request, res: Response) => {
  const actor = getActor(req);
  const query = (req.query.q as string) || '';
  const status = (req.query.status as VehicleStatus) || undefined;
  if (!query) {
    return res.json({ matches: [] });
  }
  const matches = db.searchChassis(query, status, actor);
  res.json({ matches, count: matches.length });
});

apiRouter.get('/vehicles/:id', (req: Request, res: Response) => {
  const vehicle = db.getVehicleById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found.' });
  }
  const history = db.getVehicleHistory(vehicle.id);
  res.json({ vehicle, history });
});

// WORKFLOW STEP 2: Release from port (AT PORT -> ON TRANSIT)
apiRouter.post('/vehicles/:id/release', (req: Request, res: Response) => {
  const actor = getActor(req);
  // Authorization check: Port Release user or Admin
  if (actor.role !== 'PORT_RELEASE' && actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized. Only Port Release Officers or Admins can release vehicles from port.' });
  }

  const { notes } = req.body;
  const result = db.releaseFromPort(req.params.id, actor, notes);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, vehicle: result.vehicle });
});

// WORKFLOW STEP 3: Receive at GALCO (ON TRANSIT -> RECEIVED AT GALCO)
apiRouter.post('/vehicles/:id/receive', (req: Request, res: Response) => {
  const actor = getActor(req);
  // Authorization check: GALCO Receiving user or Admin
  if (actor.role !== 'GALCO_RECEIVING' && actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized. Only GALCO Receiving Officers or Admins can confirm receipt of vehicles.' });
  }

  const { notes } = req.body;
  const result = db.receiveAtGalco(req.params.id, actor, notes);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, vehicle: result.vehicle });
});

// Admin Update / Override Vehicle
apiRouter.put('/vehicles/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin authorization required to edit vehicle records.' });
  }

  const { serialNumber, chassisNumber, description, status, vesselName, voyageNumber, notes } = req.body;
  const result = db.adminUpdateVehicle(
    req.params.id,
    { serialNumber, chassisNumber, description, status, vesselName, voyageNumber, notes },
    actor
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, vehicle: result.vehicle });
});

// Admin Delete Vehicle
apiRouter.delete('/vehicles/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin authorization required to delete vehicles.' });
  }

  const result = db.adminDeleteVehicle(req.params.id, actor);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, message: 'Vehicle deleted successfully.' });
});

// 3. Manifest Validation and Import
apiRouter.post('/manifests/validate', (req: Request, res: Response) => {
  const { rows, vesselName, voyageNumber } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'Invalid payload: rows must be an array.' });
  }

  const validation = db.validateManifestRows(rows, vesselName, voyageNumber);
  res.json(validation);
});

apiRouter.post('/manifests/import', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can import manifest files.' });
  }

  const { fileName, validRows, vesselName, voyageNumber, portOfDischarge, isVisibleInOperations } = req.body;
  if (!fileName || !Array.isArray(validRows) || validRows.length === 0) {
    return res.status(400).json({ error: 'No valid rows provided for import.' });
  }

  const result = db.importManifest(fileName, validRows, actor, {
    vesselName,
    voyageNumber,
    portOfDischarge,
    isVisibleInOperations: typeof isVisibleInOperations === 'boolean' ? isVisibleInOperations : true,
  });
  res.json({ success: true, ...result });
});

apiRouter.get('/manifests', (_req: Request, res: Response) => {
  res.json({ manifests: db.getManifests() });
});

// Admin Delete Manifest (Rollback batch)
apiRouter.delete('/manifests/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can delete manifests.' });
  }

  const result = db.adminDeleteManifest(req.params.id, actor);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    message: `Manifest deleted successfully. ${result.removedCount} vehicle records rolled back.`,
    removedCount: result.removedCount,
    manifest: result.manifest,
  });
});

// Marine Vessel Operations & Visibility Endpoints
apiRouter.get('/vessels', (req: Request, res: Response) => {
  const visibleOnly = req.query.visibleOnly === 'true';
  const vessels = visibleOnly ? db.getVisibleVessels() : db.getVessels();
  res.json({ vessels });
});

apiRouter.post('/vessels', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can register marine vessels.' });
  }

  const { name, voyageNumber, portOfDischarge, notes, isVisibleInOperations } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vessel name is required.' });
  }

  const vessel = db.createVessel({ name, voyageNumber, portOfDischarge, notes, isVisibleInOperations }, actor);
  res.json({ success: true, vessel });
});

apiRouter.put('/vessels-visibility', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can update operational vessel visibility.' });
  }

  const { visibleVessels } = req.body;
  if (!Array.isArray(visibleVessels)) {
    return res.status(400).json({ error: 'visibleVessels must be an array of vessel names.' });
  }

  const updatedVessels = db.bulkSetVesselsVisibility(visibleVessels, actor);
  res.json({ success: true, vessels: updatedVessels });
});

apiRouter.put('/vessels/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can update vessel records.' });
  }

  const { name, voyageNumber, portOfDischarge, status, isVisibleInOperations, notes } = req.body;
  const updated = db.updateVessel(
    req.params.id,
    { name, voyageNumber, portOfDischarge, status, isVisibleInOperations, notes },
    actor
  );

  if (!updated) {
    return res.status(404).json({ error: 'Marine vessel not found.' });
  }

  res.json({ success: true, vessel: updated });
});

apiRouter.delete('/vessels/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can delete vessel records.' });
  }

  const success = db.deleteVessel(req.params.id, actor);
  if (!success) {
    return res.status(404).json({ error: 'Marine vessel not found.' });
  }

  res.json({ success: true, message: 'Vessel removed successfully.' });
});

// 4. User Management (Admin only)
apiRouter.get('/users', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can access user management.' });
  }
  res.json({ users: db.getUsers() });
});

apiRouter.post('/users', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can create users.' });
  }

  const { name, email, username, role, status, password } = req.body;
  if (!name || !email || !username || !role) {
    return res.status(400).json({ error: 'Name, email, username and role are required.' });
  }

  // Check unique email/username
  const existing = db.getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'User with this email or username already exists.' });
  }

  const user = db.createUser({ name, email, username, role, status: status || 'ACTIVE' }, password, actor);
  res.json({ success: true, user });
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can update users.' });
  }

  const { name, email, username, role, status, password } = req.body;
  const updated = db.updateUser(req.params.id, { name, email, username, role, status }, password, actor);
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ success: true, user: updated });
});

// 5. Audit Logs
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (actor.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admins can access audit logs.' });
  }
  res.json({ logs: db.getAuditLogs() });
});

// 6. Statistics & Reports
apiRouter.get('/stats', (req: Request, res: Response) => {
  const { vesselName } = req.query;
  res.json(db.getDashboardStats(vesselName as string));
});

// 7. Reset to demo data
apiRouter.post('/seed/reset', (req: Request, res: Response) => {
  const actor = getActor(req);
  db.seedInitialData();
  res.json({ success: true, message: 'Database reset to initial demo state.' });
});
