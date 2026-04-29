const { query, queryWith } = require('../../config/database');

const runQuery = (db, sql, params = []) => (db ? queryWith(db, sql, params) : query(sql, params));

const createProfile = async ({ driverId, licenseNumber, trikeId, status = 'offline' }, db) => {
  await runQuery(
    db,
    `
      INSERT INTO drivers (driverid, licensenumber, trikeid, status)
      VALUES (?, ?, ?, ?)
    `,
    [driverId, licenseNumber || null, null, status],
  );

  if (trikeId) {
    await runQuery(db, 'UPDATE trikes SET driverid = ? WHERE trikeid = ?', [driverId, trikeId]);
  }

  return findById(driverId, db);
};

const list = async ({ status, licenseNumber, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
  }

  if (licenseNumber) {
    conditions.push('d.licensenumber LIKE ?');
    params.push(`%${licenseNumber}%`);
  }

  const safeLimit = Math.max(1, parseInt(limit ?? 20, 10) || 20);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `
      SELECT d.driverid, d.licensenumber, d.status, d.lastactive,
             u.fullname, u.contactnumber, u.email, u.username,
             COUNT(t.trikeid) AS trikecount
      FROM drivers d
      INNER JOIN users u ON u.userid = d.driverid
      LEFT JOIN trikes t ON t.driverid = d.driverid
      ${whereClause}
      GROUP BY d.driverid, d.licensenumber, d.status, d.lastactive, u.fullname, u.contactnumber, u.email, u.username
      ORDER BY d.lastactive DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    params,
  );
};

const findById = async (driverId, db) => {
  const rows = await runQuery(
    db,
    `
      SELECT d.driverid, d.licensenumber, d.status, d.lastactive,
             u.fullname, u.contactnumber, u.email, u.username
      FROM drivers d
      INNER JOIN users u ON u.userid = d.driverid
      WHERE d.driverid = ?
      LIMIT 1
    `,
    [driverId],
  );

  const driver = rows[0] || null;

  if (!driver) {
    return null;
  }

  driver.trikes = await runQuery(
    db,
    `
      SELECT *
      FROM trikes
      WHERE driverid = ?
      ORDER BY createdat DESC
    `,
    [driverId],
  );

  return driver;
};

const update = async (driverId, payload, db) => {
  const updates = [];
  const params = [];

  if (typeof payload.licenseNumber !== 'undefined') {
    updates.push('licensenumber = ?');
    params.push(payload.licenseNumber || null);
  }

  if (typeof payload.status !== 'undefined') {
    updates.push('status = ?', 'lastactive = CURRENT_TIMESTAMP');
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await runQuery(db, `UPDATE drivers SET ${updates.join(', ')} WHERE driverid = ?`, [...params, driverId]);
  return result.affectedRows > 0;
};

const remove = async (driverId, db) => {
  await runQuery(db, 'UPDATE trikes SET driverid = NULL WHERE driverid = ?', [driverId]);
  const result = await runQuery(db, 'DELETE FROM drivers WHERE driverid = ?', [driverId]);
  return result.affectedRows > 0;
};

module.exports = {
  createProfile,
  list,
  findById,
  update,
  remove,
};