const violationsService = require('./violations.service');

const canManageViolation = (user, violation) => user.role === 'admin' || (user.role === 'driver' && violation.driverid === user.userId);

const listViolations = async (req, res) => {
  const filters = { ...req.query };
  filters.limit = parseInt(filters.limit ?? '20', 10);
  filters.offset = parseInt(filters.offset ?? '0', 10);
  if (isNaN(filters.limit) || filters.limit < 1) filters.limit = 20;
  if (isNaN(filters.offset) || filters.offset < 0) filters.offset = 0;

  if (req.user.role === 'driver') {
    filters.driverId = req.user.userId;
  }

  const violations = await violationsService.list(filters);
  return res.json({ data: violations });
};

const getViolationById = async (req, res) => {
  const violation = await violationsService.findById(req.params.violationId);

  if (!violation) {
    return res.status(404).json({ message: 'Violation not found.' });
  }

  if (!canManageViolation(req.user, violation)) {
    return res.status(403).json({ message: 'You can only view your own violations.' });
  }

  return res.json({ data: violation });
};

const createViolation = async (req, res) => {
  // Force the reporting passenger's identity so callers cannot impersonate others.
  const payload = {
    ...req.body,
    // Passengers must report under their own account.
    passengerId: req.user.role === 'passenger' ? req.user.userId : req.body.passengerId,
    // Drivers and admins may not set status to anything other than 'pending' on creation.
    status: req.user.role === 'admin' ? (req.body.status ?? 'pending') : 'pending',
  };
  const violationId = await violationsService.create(payload);
  const violation = await violationsService.findById(violationId);
  return res.status(201).json({ message: 'Violation created successfully.', data: violation });
};

const updateViolation = async (req, res) => {
  const violation = await violationsService.findById(req.params.violationId);

  if (!violation) {
    return res.status(404).json({ message: 'Violation not found.' });
  }

  if (!canManageViolation(req.user, violation)) {
    return res.status(403).json({ message: 'You can only update your own violations.' });
  }

  const updated = await violationsService.update(violation.violationid, req.body);

  if (!updated) {
    return res.status(400).json({ message: 'No violation fields were updated.' });
  }

  const refreshed = await violationsService.findById(violation.violationid);
  return res.json({ message: 'Violation updated successfully.', data: refreshed });
};

const replaceViolation = async (req, res) => {
  const violation = await violationsService.findById(req.params.violationId);

  if (!violation) {
    return res.status(404).json({ message: 'Violation not found.' });
  }

  if (!canManageViolation(req.user, violation)) {
    return res.status(403).json({ message: 'You can only replace your own violations.' });
  }

  const updated = await violationsService.update(violation.violationid, req.body);

  if (!updated) {
    return res.status(400).json({ message: 'Violation was not updated.' });
  }

  const refreshed = await violationsService.findById(violation.violationid);
  return res.json({ message: 'Violation replaced successfully.', data: refreshed });
};

const listViolationTypes = async (req, res) => {
  const types = await violationsService.listTypes(req.query);
  return res.json({ data: types });
};

const getViolationTypeById = async (req, res) => {
  const type = await violationsService.findTypeById(req.params.violationTypeId);

  if (!type) {
    return res.status(404).json({ message: 'Violation type not found.' });
  }

  return res.json({ data: type });
};

const createViolationType = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create violation types.' });
  }

  const typeId = await violationsService.createType(req.body);
  const type = await violationsService.findTypeById(typeId);
  return res.status(201).json({ message: 'Violation type created successfully.', data: type });
};

const replaceViolationType = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can replace violation types.' });
  }

  const updated = await violationsService.updateType(req.params.violationTypeId, req.body);

  if (!updated) {
    return res.status(404).json({ message: 'Violation type not found.' });
  }

  const type = await violationsService.findTypeById(req.params.violationTypeId);
  return res.json({ message: 'Violation type replaced successfully.', data: type });
};

const updateViolationType = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can update violation types.' });
  }

  const updated = await violationsService.updateType(req.params.violationTypeId, req.body);

  if (!updated) {
    return res.status(404).json({ message: 'Violation type not found.' });
  }

  const type = await violationsService.findTypeById(req.params.violationTypeId);
  return res.json({ message: 'Violation type updated successfully.', data: type });
};

const deleteViolationType = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete violation types.' });
  }

  const deleted = await violationsService.removeType(req.params.violationTypeId);

  if (!deleted) {
    return res.status(404).json({ message: 'Violation type not found.' });
  }

  return res.status(204).send();
};

const deleteViolation = async (req, res) => {
  const deleted = await violationsService.remove(req.params.violationId);

  if (!deleted) {
    return res.status(404).json({ message: 'Violation not found.' });
  }

  return res.status(204).send();
};

module.exports = {
  listViolations,
  getViolationById,
  createViolation,
  replaceViolation,
  updateViolation,
  deleteViolation,
  listViolationTypes,
  getViolationTypeById,
  createViolationType,
  replaceViolationType,
  updateViolationType,
  deleteViolationType,
};