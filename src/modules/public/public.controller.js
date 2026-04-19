const usersService = require('../users/users.service');
const { query } = require('../../config/database');

const getAdminCount = async (req, res) => {
  const cnt = await usersService.countByRole('admin');
  return res.json({ data: { count: cnt } });
};

/**
 * GET /public/driver-lookup?plate=ABC&name=John&id=5
 * No auth required — used by passengers to pre-fill driver info in reports.
 * With no params: returns all recent drivers (up to 100) for the driver list.
 * With ?id=: returns that specific driver.
 * With ?plate= or ?name=: searches by plate number or driver name.
 */
const lookupDriver = async (req, res) => {
  const plate = (req.query.plate || '').trim();
  const name  = (req.query.name  || '').trim();
  const id    = parseInt(req.query.id || '', 10);

  // No params → return all drivers (for the driver selection list screen).
  if (!plate && !name && isNaN(id)) {
    const rows = await query(
      `
        SELECT
          d.driverid,
          u.fullname        AS driverName,
          t.platenumber     AS plateNumber,
          t.chassisnumber   AS chassisNumber,
          t.franchisenumber AS franchiseNumber,
          t.model,
          t.color
        FROM trikes t
        INNER JOIN drivers d ON d.driverid = t.driverid
        INNER JOIN users   u ON u.userid   = d.driverid
        ORDER BY u.fullname ASC
        LIMIT 100
      `,
      [],
    );
    return res.json({ data: rows });
  }

  const conditions = [];
  const params = [];

  if (id && !isNaN(id)) {
    conditions.push('d.driverid = ?');
    params.push(id);
  }
  // Allow searching both name and plate together or independently
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
      LIMIT 20
    `,
    params,
  );

  return res.json({ data: rows });
};

module.exports = {
  getAdminCount,
  lookupDriver,
};
