const { query } = require('../../config/database');

const list = async ({ status, driverId, passengerId, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  if (driverId) {
    conditions.push('b.driverid = ?');
    params.push(Number(driverId));
  }

  if (passengerId) {
    conditions.push('b.passengerid = ?');
    params.push(Number(passengerId));
  }

  const safeLimit = Math.max(1, parseInt(limit ?? 20, 10) || 20);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `
      SELECT b.*, passenger.fullname AS passengername, driver.fullname AS drivername
      FROM bookings b
      LEFT JOIN users passenger ON passenger.userid = b.passengerid
      LEFT JOIN users driver ON driver.userid = b.driverid
      ${whereClause}
      ORDER BY b.bookingtime DESC
      LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, safeOffset],
  );
};

const findById = async (bookingId) => {
  const rows = await query(
    `
      SELECT b.*, passenger.fullname AS passengername, driver.fullname AS drivername
      FROM bookings b
      LEFT JOIN users passenger ON passenger.userid = b.passengerid
      LEFT JOIN users driver ON driver.userid = b.driverid
      WHERE b.bookingid = ?
      LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] || null;
};

const create = async (payload) => {
  const result = await query(
    `
      INSERT INTO bookings (
        passengerid, driverid, pickuplocation, dropofflocation,
        pickuplat, pickuplng, dropofflat, dropofflng, fare, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.passengerId,
      payload.driverId || null,
      payload.pickupLocation,
      payload.dropoffLocation,
      payload.pickupLat,
      payload.pickupLng,
      payload.dropoffLat,
      payload.dropoffLng,
      payload.fare,
      payload.status || 'pending',
    ],
  );

  return result.insertId;
};

const update = async (bookingId, payload) => {
  const updates = [];
  const params = [];

  const directMap = {
    driverId: 'driverid',
    pickupLocation: 'pickuplocation',
    dropoffLocation: 'dropofflocation',
    pickupLat: 'pickuplat',
    pickupLng: 'pickuplng',
    dropoffLat: 'dropofflat',
    dropoffLng: 'dropofflng',
    fare: 'fare',
  };

  Object.entries(directMap).forEach(([field, column]) => {
    if (typeof payload[field] !== 'undefined') {
      updates.push(`${column} = ?`);
      params.push(payload[field]);
    }
  });

  if (typeof payload.status !== 'undefined') {
    updates.push('status = ?');
    params.push(payload.status);

    if (payload.status === 'accepted') {
      updates.push('acceptedtime = CURRENT_TIMESTAMP');
    }

    if (payload.status === 'completed') {
      updates.push('completedtime = CURRENT_TIMESTAMP');
    }
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await query(`UPDATE bookings SET ${updates.join(', ')} WHERE bookingid = ?`, [...params, bookingId]);
  return result.affectedRows > 0;
};

const remove = async (bookingId) => {
  const result = await query('DELETE FROM bookings WHERE bookingid = ?', [bookingId]);
  return result.affectedRows > 0;
};

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
};