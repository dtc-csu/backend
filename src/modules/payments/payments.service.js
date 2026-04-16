const { query } = require('../../config/database');

const list = async ({ bookingId, paymentStatus, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (bookingId) {
    conditions.push('p.bookingid = ?');
    params.push(bookingId);
  }

  if (paymentStatus) {
    conditions.push('p.paymentstatus = ?');
    params.push(paymentStatus);
  }

  const safeLimit = Math.max(1, parseInt(limit ?? 20, 10) || 20);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `
      SELECT p.*, b.passengerid
      FROM payments p
      LEFT JOIN bookings b ON b.bookingid = p.bookingid
      ${whereClause}
      ORDER BY p.createdat DESC
      LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, safeOffset],
  );
};

const findById = async (paymentId) => {
  const rows = await query(
    `
      SELECT p.*, b.passengerid
      FROM payments p
      LEFT JOIN bookings b ON b.bookingid = p.bookingid
      WHERE p.paymentid = ?
      LIMIT 1
    `,
    [paymentId],
  );

  return rows[0] || null;
};

const create = async ({ bookingId, amount, paymentMethod, paymentStatus, referenceNumber }) => {
  const result = await query(
    `
      INSERT INTO payments (bookingid, amount, paymentmethod, paymentstatus, referencenumber, paidat)
      VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
    `,
    [bookingId, amount, paymentMethod, paymentStatus, referenceNumber || null, paymentStatus],
  );

  return result.insertId;
};

const update = async (paymentId, payload) => {
  const updates = [];
  const params = [];
  const directMap = {
    amount: 'amount',
    paymentMethod: 'paymentmethod',
    paymentStatus: 'paymentstatus',
    referenceNumber: 'referencenumber',
  };

  Object.entries(directMap).forEach(([field, column]) => {
    if (typeof payload[field] !== 'undefined') {
      updates.push(`${column} = ?`);
      params.push(payload[field]);
    }
  });

  if (typeof payload.paymentStatus !== 'undefined' && payload.paymentStatus === 'paid') {
    updates.push('paidat = CURRENT_TIMESTAMP');
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await query(`UPDATE payments SET ${updates.join(', ')} WHERE paymentid = ?`, [...params, paymentId]);
  return result.affectedRows > 0;
};

const remove = async (paymentId) => {
  const result = await query('DELETE FROM payments WHERE paymentid = ?', [paymentId]);
  return result.affectedRows > 0;
};

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
};