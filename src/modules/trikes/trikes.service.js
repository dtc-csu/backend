const { query, queryWith } = require('../../config/database');

const runQuery = (db, sql, params = []) => (db ? queryWith(db, sql, params) : query(sql, params));

const list = async ({ plateNumber, driverId, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (plateNumber) {
    conditions.push('platenumber LIKE ?');
    params.push(`%${plateNumber}%`);
  }

  if (driverId) {
    conditions.push('driverid = ?');
    params.push(driverId);
  }

  const safeLimit = Math.max(1, parseInt(limit ?? 20, 10) || 20);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `
      SELECT *
      FROM trikes
      ${whereClause}
      ORDER BY createdat DESC
      LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, safeOffset],
  );
};

const findById = async (trikeId, db) => {
  const rows = await runQuery(db, 'SELECT * FROM trikes WHERE trikeid = ? LIMIT 1', [trikeId]);
  return rows[0] || null;
};

const create = async ({ driverId, plateNumber, color, franchiseNumber, capacity, motorNumber, model, chassisNumber }, db) => {
  const result = await runQuery(
    db,
    `
      INSERT INTO trikes (driverid, platenumber, color, franchisenumber, capacity, motornumber, model, chassisnumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [driverId || null, plateNumber, color || null, franchiseNumber || null, capacity, motorNumber || null, model || null, chassisNumber || null],
  );

  return result.insertId;
};

const update = async (trikeId, payload, db) => {
  const updates = [];
  const params = [];
  const directMap = {
    driverId: 'driverid',
    plateNumber: 'platenumber',
    color: 'color',
    franchiseNumber: 'franchisenumber',
    capacity: 'capacity',
    motorNumber: 'motornumber',
    model: 'model',
    chassisNumber: 'chassisnumber',
  };

  Object.entries(directMap).forEach(([field, column]) => {
    if (typeof payload[field] !== 'undefined') {
      updates.push(`${column} = ?`);
      params.push(payload[field]);
    }
  });

  if (updates.length === 0) {
    return false;
  }

  const result = await runQuery(db, `UPDATE trikes SET ${updates.join(', ')} WHERE trikeid = ?`, [...params, trikeId]);
  return result.affectedRows > 0;
};

const remove = async (trikeId, db) => {
  const result = await runQuery(db, 'DELETE FROM trikes WHERE trikeid = ?', [trikeId]);
  return result.affectedRows > 0;
};

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
};