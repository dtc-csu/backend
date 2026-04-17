const driversService = require('./drivers.service');
const trikesService = require('../trikes/trikes.service');
const { withTransaction } = require('../../config/database');

// Use == (not ===) so a string userId from JWT still matches a numeric driverId.
const canManageDriver = (user, driverId) =>
  user.role === 'admin' || (user.role === 'driver' && Number(user.userId) === Number(driverId));

const listDrivers = async (req, res) => {
  const drivers = await driversService.list(req.query);
  return res.json({ data: drivers });
};

const getDriverById = async (req, res) => {
  const driver = await driversService.findById(req.params.driverId);

  if (!driver) {
    return res.status(404).json({ message: 'Driver not found.' });
  }

  return res.json({ data: driver });
};

const createDriver = async (req, res) => {
  const driver = await withTransaction((db) => driversService.createProfile(req.body, db));
  return res.status(201).json({ message: 'Driver profile created successfully.', data: driver });
};

const updateDriver = async (req, res) => {
  const targetDriverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, targetDriverId)) {
    return res.status(403).json({ message: 'You can only update your own driver profile.' });
  }

  // If no drivers row exists yet, create one first (handles accounts made before auto-profile creation).
  let existing = await driversService.findById(targetDriverId);
  if (!existing) {
    try {
      await withTransaction((db) => driversService.createProfile({ driverId: targetDriverId }, db));
    } catch (_) {
      return res.status(404).json({ message: 'Driver not found and could not be initialised.' });
    }
  }

  await driversService.update(targetDriverId, req.body);
  const driver = await driversService.findById(targetDriverId);
  return res.json({ message: 'Driver updated successfully.', data: driver });
};

const replaceDriver = async (req, res) => {
  const targetDriverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, targetDriverId)) {
    return res.status(403).json({ message: 'You can only replace your own driver profile.' });
  }

  let existing = await driversService.findById(targetDriverId);
  if (!existing) {
    try {
      await withTransaction((db) => driversService.createProfile({ driverId: targetDriverId }, db));
    } catch (_) {
      return res.status(404).json({ message: 'Driver not found and could not be initialised.' });
    }
  }

  await driversService.update(targetDriverId, req.body);
  const driver = await driversService.findById(targetDriverId);
  return res.json({ message: 'Driver replaced successfully.', data: driver });
};

const listDriverTrikes = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to this driver fleet.' });
  }

  const trikes = await trikesService.list({ ...req.query, driverId });
  return res.json({ data: trikes });
};

const getDriverTrikeById = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to this driver fleet.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike || trike.driverid !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  return res.json({ data: trike });
};

const createDriverTrike = async (req, res) => {
  const driverId = Number(req.params.driverId);

  // Admins can create trikes for any driver.
  // Drivers can create trikes for themselves only.
  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to manage this driver fleet.' });
  }

  let driver = await driversService.findById(driverId);

  // Auto-create driver profile if it doesn't exist yet (e.g. registered via legacy flow).
  if (!driver) {
    try {
      driver = await withTransaction((db) => driversService.createProfile({ driverId }, db));
    } catch (_) {
      return res.status(404).json({ message: 'Driver profile not found and could not be created automatically.' });
    }
  }

  let trike;
  try {
    trike = await withTransaction(async (db) => {
      const trikeId = await trikesService.create({ ...req.body, driverId }, db);
      // Also update the drivers table to reference the newly created trike
      await db.execute('UPDATE drivers SET trikeid = ? WHERE driverid = ?', [trikeId, driverId]);
      return trikesService.findById(trikeId, db);
    });
  } catch (err) {
    // MySQL duplicate plate number
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A trike with that plate number already exists.' });
    }
    throw err;
  }
  return res.status(201).json({ message: 'Driver trike created successfully.', data: trike });
};

const replaceDriverTrike = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to replace this trike.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike || Number(trike.driverid) !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  let updated;
  try {
    updated = await trikesService.update(trike.trikeid, { ...req.body, driverId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A trike with that plate number already exists.' });
    }
    throw err;
  }

  if (!updated) {
    return res.status(400).json({ message: 'Driver trike was not updated.' });
  }

  const refreshed = await trikesService.findById(trike.trikeid);
  return res.json({ message: 'Driver trike replaced successfully.', data: refreshed });
};

const updateDriverTrike = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to update this trike.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike || Number(trike.driverid) !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  let updated;
  try {
    updated = await trikesService.update(trike.trikeid, req.body);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A trike with that plate number already exists.' });
    }
    throw err;
  }

  if (!updated) {
    return res.status(400).json({ message: 'Driver trike was not updated.' });
  }

  const refreshed = await trikesService.findById(trike.trikeid);
  return res.json({ message: 'Driver trike updated successfully.', data: refreshed });
};

const deleteDriverTrike = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete driver trikes.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike || trike.driverid !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  await trikesService.remove(trike.trikeid);
  return res.status(204).send();
};

const deleteDriver = async (req, res) => {
  const deleted = await withTransaction((db) => driversService.remove(req.params.driverId, db));

  if (!deleted) {
    return res.status(404).json({ message: 'Driver not found.' });
  }

  return res.status(204).send();
};

module.exports = {
  listDrivers,
  getDriverById,
  createDriver,
  replaceDriver,
  updateDriver,
  listDriverTrikes,
  getDriverTrikeById,
  createDriverTrike,
  replaceDriverTrike,
  updateDriverTrike,
  deleteDriverTrike,
  deleteDriver,
};