const { query } = require('../../config/database');

const list = async ({ driverId, status, search, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (driverId) {
    conditions.push('v.driverid = ?');
    params.push(driverId);
  }

  if (status) {
    conditions.push('v.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('v.description LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `
      SELECT v.*, u.fullname AS drivername, vt.name AS violationtypename
      FROM violations v
      LEFT JOIN users u ON u.userid = v.driverid
      LEFT JOIN violation_types vt ON vt.violationtypeid = v.violationtypeid
      ${whereClause}
      ORDER BY v.createdat DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );
};

const findById = async (violationId) => {
  const rows = await query(
    `
      SELECT v.*, u.fullname AS drivername, vt.name AS violationtypename
      FROM violations v
      LEFT JOIN users u ON u.userid = v.driverid
      LEFT JOIN violation_types vt ON vt.violationtypeid = v.violationtypeid
      WHERE v.violationid = ?
      LIMIT 1
    `,
    [violationId],
  );

  return rows[0] || null;
};

const create = async ({ driverId, bookingId, violationTypeId, description, latitude, longitude, status }) => {
  const result = await query(
    `
      INSERT INTO violations (driverid, bookingid, violationtypeid, description, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [driverId, bookingId || null, violationTypeId || null, description, latitude || null, longitude || null, status || 'pending'],
  );

  return result.insertId;
};

const listTypes = async ({ includeInactive = false }) => {
  const conditions = includeInactive ? '' : 'WHERE isactive = 1';

  return query(
    `
      SELECT violationtypeid, name, defaultpenalty, isactive, createdat
      FROM violation_types
      ${conditions}
      ORDER BY name ASC
    `,
  );
};

const findTypeById = async (violationTypeId) => {
  const rows = await query(
    `
      SELECT violationtypeid, name, defaultpenalty, isactive, createdat
      FROM violation_types
      WHERE violationtypeid = ?
      LIMIT 1
    `,
    [violationTypeId],
  );

  return rows[0] || null;
};

const createType = async ({ name, defaultPenalty, isActive }) => {
  const result = await query(
    `
      INSERT INTO violation_types (name, defaultpenalty, isactive)
      VALUES (?, ?, ?)
    `,
    [name, defaultPenalty ?? null, isActive ? 1 : 0],
  );

  return result.insertId;
};

const update = async (violationId, payload) => {
  const updates = [];
  const params = [];
  const directMap = {
    bookingId: 'bookingid',
    violationTypeId: 'violationtypeid',
    description: 'description',
    latitude: 'latitude',
    longitude: 'longitude',
    status: 'status',
  };

  Object.entries(directMap).forEach(([field, column]) => {
    if (typeof payload[field] !== 'undefined') {
      updates.push(`${column} = ?`);
      params.push(payload[field]);
    }
  });

  if (typeof payload.status !== 'undefined' && ['resolved', 'dismissed'].includes(payload.status)) {
    updates.push('resolvedat = CURRENT_TIMESTAMP');
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await query(`UPDATE violations SET ${updates.join(', ')} WHERE violationid = ?`, [...params, violationId]);
  return result.affectedRows > 0;
};

const updateType = async (violationTypeId, payload) => {
  const updates = [];
  const params = [];
  const directMap = {
    name: 'name',
    defaultPenalty: 'defaultpenalty',
  };

  Object.entries(directMap).forEach(([field, column]) => {
    if (typeof payload[field] !== 'undefined') {
      updates.push(`${column} = ?`);
      params.push(payload[field]);
    }
  });

  if (typeof payload.isActive !== 'undefined') {
    updates.push('isactive = ?');
    params.push(payload.isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await query(
    `UPDATE violation_types SET ${updates.join(', ')} WHERE violationtypeid = ?`,
    [...params, violationTypeId],
  );

  return result.affectedRows > 0;
};

const remove = async (violationId) => {
  const result = await query('DELETE FROM violations WHERE violationid = ?', [violationId]);
  return result.affectedRows > 0;
};

const removeType = async (violationTypeId) => {
  const result = await query('DELETE FROM violation_types WHERE violationtypeid = ?', [violationTypeId]);
  return result.affectedRows > 0;
};

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  listTypes,
  findTypeById,
  createType,
  updateType,
  removeType,
};