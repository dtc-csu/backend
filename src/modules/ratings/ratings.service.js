const { query } = require('../../config/database');

const create = async ({ bookingId, passengerId, driverId, rating, comment }) => {
  const result = await query(
    `INSERT INTO ratings (bookingid, passengerid, driverid, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [bookingId, passengerId, driverId, rating, comment || null],
  );
  const rows = await query('SELECT * FROM ratings WHERE ratingid = ?', [result.insertId]);
  return rows[0] || null;
};

const listByDriver = async (driverId, { limit = 25, offset = 0 } = {}) => {
  const safeLimit = Math.max(1, parseInt(limit ?? 25, 10) || 25);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);

  // Inline LIMIT/OFFSET as literals to avoid prepared-statement issues
  return query(
    `SELECT r.*, u.fullname AS passengername
     FROM ratings r
     LEFT JOIN users u ON u.userid = r.passengerid
     WHERE r.driverid = ?
     ORDER BY r.createdat DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [driverId],
  );
};

const listByBooking = async (bookingId) => {
  return query(
    `SELECT r.*, u.fullname AS passengername
     FROM ratings r
     LEFT JOIN users u ON u.userid = r.passengerid
     WHERE r.bookingid = ?
     LIMIT 1`,
    [bookingId],
  );
};

const listByPassenger = async (passengerId, { limit = 25, offset = 0 } = {}) => {
  const safeLimit = Math.max(1, parseInt(limit ?? 25, 10) || 25);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);

  return query(
    `SELECT r.*, d.fullname AS drivername
     FROM ratings r
     LEFT JOIN users d ON d.userid = r.driverid
     WHERE r.passengerid = ?
     ORDER BY r.createdat DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [passengerId],
  );
};

const averageForDriver = async (driverId) => {
  const rows = await query(
    `SELECT AVG(rating) AS average, COUNT(*) AS total
     FROM ratings
     WHERE driverid = ?`,
    [driverId],
  );
  return rows[0] || { average: null, total: 0 };
};

const listAll = async ({ limit = 25, offset = 0 } = {}) => {
  const safeLimit = Math.max(1, parseInt(limit ?? 25, 10) || 25);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);

  return query(
    `SELECT r.*,
            p.fullname AS passengername,
            d.fullname AS drivername
     FROM ratings r
     LEFT JOIN users p ON p.userid = r.passengerid
     LEFT JOIN users d ON d.userid = r.driverid
     ORDER BY r.createdat DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [],
  );
};

module.exports = { create, listByDriver, listByBooking, listByPassenger, averageForDriver, listAll };
