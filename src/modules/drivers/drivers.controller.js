const driversService = require('./drivers.service');
const trikesService = require('../trikes/trikes.service');
const { withTransaction } = require('../../config/database');

const canManageDriver = (user, driverId) => user.role === 'admin' || (user.role === 'driver' && user.userId === driverId);

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

  const updated = await driversService.update(targetDriverId, req.body);

  if (!updated) {
    return res.status(404).json({ message: 'Driver not found.' });
  }

  const driver = await driversService.findById(targetDriverId);
  return res.json({ message: 'Driver updated successfully.', data: driver });
};

const replaceDriver = async (req, res) => {
  const targetDriverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, targetDriverId)) {
    return res.status(403).json({ message: 'You can only replace your own driver profile.' });
  }

  const updated = await driversService.update(targetDriverId, req.body);

  if (!updated) {
    return res.status(404).json({ message: 'Driver not found.' });
  }

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

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create trikes for a driver.' });
  }

  const driver = await driversService.findById(driverId);

  if (!driver) {
    return res.status(404).json({ message: 'Driver not found.' });
  }

  const trike = await withTransaction(async (db) => {
    const trikeId = await trikesService.create({ ...req.body, driverId }, db);
    return trikesService.findById(trikeId, db);
  });
  return res.status(201).json({ message: 'Driver trike created successfully.', data: trike });
};

const replaceDriverTrike = async (req, res) => {
  const driverId = Number(req.params.driverId);

  if (!canManageDriver(req.user, driverId)) {
    return res.status(403).json({ message: 'You do not have access to replace this trike.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike || trike.driverid !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  const updated = await trikesService.update(trike.trikeid, { ...req.body, driverId });

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

  if (!trike || trike.driverid !== driverId) {
    return res.status(404).json({ message: 'Trike not found for this driver.' });
  }

  const updated = await trikesService.update(trike.trikeid, req.body);

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