const usersService = require('../users/users.service');
const { query } = require('../../config/database');

const getAdminCount = async (req, res) => {
  const cnt = await usersService.countByRole('admin');
  return res.json({ data: { count: cnt } });
};

/**
 * GET /public/driver-lookup?plate=ABC&name=John
 * No auth required — used by passengers to pre-fill driver info in reports.
 * Returns up to 10 drivers whose trike plate OR full name matches the query.
 */
const lookupDriver = async (req, res) => {
  const plate = (req.query.plate || '').trim();
  const name  = (req.query.name  || '').trim();

  if (!plate && !name) {
    return res.status(400).json({ message: 'Provide at least plate or name to search.' });
  }

  const conditions = [];
  const params = [];

  if (plate) {
    conditions.push('t.platenumber LIKE ?');
    params.push(`%${plate}%`);
  }
  if (name) {
    conditions.push('u.fullname LIKE ?');
    params.push(`%${name}%`);
  }

  const rows = await query(
    `
      SELECT
        d.driverid,
        u.fullname       AS driverName,
        t.platenumber    AS plateNumber,
        t.chassisnumber  AS chassisNumber,
        t.franchisenumber AS franchiseNumber,
        t.model,
        t.color
      FROM trikes t
      INNER JOIN drivers d ON d.driverid = t.driverid
      INNER JOIN users   u ON u.userid   = d.driverid
      WHERE ${conditions.join(' OR ')}
      ORDER BY t.createdat DESC
      LIMIT 10
    `,
    params,
  );

  return res.json({ data: rows });
};

module.exports = {
  getAdminCount,
  lookupDriver,
};
