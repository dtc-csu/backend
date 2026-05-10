const { query, queryWith } = require('../../config/database');
const { hashPassword } = require('../../utils/auth');

const runQuery = (db, sql, params = []) => (db ? queryWith(db, sql, params) : query(sql, params));

const toPublicUser = (user) => ({
  userId: user.userid,
  fullName: user.fullname,
  contactNumber: user.contactnumber,
  email: user.email,
  username: user.username,
  picFilePath: user.picfilepath,
  role: user.role,
  disabled: Number(user.disabled) === 1,
  createdAt: user.createdat,
});

const baseUserSelect = `
  SELECT userid, fullname, contactnumber, email, username, picfilepath, password, role, createdat,
         COALESCE(CAST(disabled AS UNSIGNED), 0) AS disabled
  FROM users
`;

const findById = async (userId, db) => {
  const rows = await runQuery(db, `${baseUserSelect} WHERE userid = ? LIMIT 1`, [userId]);
  return rows[0] || null;
};

const findByLogin = async (login, db) => {
  const rows = await runQuery(db, `${baseUserSelect} WHERE email = ? OR username = ? LIMIT 1`, [login, login]);
  return rows[0] || null;
};

const findByEmailOrPhone = async (target, db) => {
  const rows = await runQuery(
    db,
    `${baseUserSelect} WHERE email = ? OR contactnumber = ? LIMIT 1`,
    [target, target],
  );
  return rows[0] || null;
};

const findIdentityConflict = async ({ email, username, excludeUserId }, db) => {
  const conditions = [];
  const params = [];

  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }

  if (username) {
    conditions.push('username = ?');
    params.push(username);
  }

  if (conditions.length === 0) {
    return null;
  }

  let sql = `${baseUserSelect} WHERE (${conditions.join(' OR ')})`;

  if (excludeUserId) {
    sql += ' AND userid <> ?';
    params.push(excludeUserId);
  }

  sql += ' LIMIT 1';

  const rows = await runQuery(db, sql, params);
  return rows[0] || null;
};

const create = async ({ fullName, contactNumber, email, username, picFilePath, passwordHash, role }, db) => {
  const result = await runQuery(
    db,
    `
      INSERT INTO users (fullname, contactnumber, email, username, picfilepath, password, role, disabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `,
    [fullName, contactNumber || null, email, username, picFilePath || null, passwordHash, role],
  );

  return result.insertId;
};

const list = async ({ role, disabled, limit, offset }) => {
  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }

  if (typeof disabled === 'boolean') {
    conditions.push('disabled = ?');
    params.push(disabled ? 1 : 0);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.max(1, parseInt(limit ?? 20, 10) || 20);
  const safeOffset = Math.max(0, parseInt(offset ?? 0, 10) || 0);

  // Inline LIMIT/OFFSET as literals to avoid prepared-statement issues on some MySQL servers
  const rows = await query(
    `
      SELECT userid, fullname, contactnumber, email, username, role, createdat,
              picfilepath,
             COALESCE(CAST(disabled AS UNSIGNED), 0) AS disabled
      FROM users
      ${whereClause}
      ORDER BY createdat DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    [...params],
  );

  return rows;
};

const update = async (userId, payload, db) => {
  const updates = [];
  const params = [];

  if (typeof payload.fullName !== 'undefined') {
    updates.push('fullname = ?');
    params.push(payload.fullName);
  }

  if (typeof payload.contactNumber !== 'undefined') {
    updates.push('contactnumber = ?');
    params.push(payload.contactNumber || null);
  }

  if (typeof payload.email !== 'undefined') {
    updates.push('email = ?');
    params.push(payload.email);
  }

  if (typeof payload.username !== 'undefined') {
    updates.push('username = ?');
    params.push(payload.username);
  }

  if (typeof payload.picFilePath !== 'undefined') {
    updates.push('picfilepath = ?');
    params.push(payload.picFilePath || null);
  }

  if (typeof payload.password !== 'undefined') {
    updates.push('password = ?');
    params.push(await hashPassword(payload.password));
  }

  if (typeof payload.role !== 'undefined') {
    updates.push('role = ?');
    params.push(payload.role);
  }

  if (typeof payload.disabled !== 'undefined') {
    updates.push('disabled = ?');
    params.push(payload.disabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await runQuery(db, `UPDATE users SET ${updates.join(', ')} WHERE userid = ?`, [...params, userId]);
  return result.affectedRows > 0;
};

const disable = async (userId, db) => update(userId, { disabled: true }, db);

const remove = async (userId, db) => {
  const result = await runQuery(db, 'DELETE FROM users WHERE userid = ?', [userId]);
  return result.affectedRows > 0;
};

const countByRole = async (role) => {
  const rows = await query('SELECT COUNT(*) AS cnt FROM users WHERE role = ?', [role]);
  return rows && rows[0] ? Number(rows[0].cnt || 0) : 0;
};

module.exports = {
  toPublicUser,
  findById,
  findByLogin,
  findByEmailOrPhone,
  findIdentityConflict,
  create,
  list,
  update,
  disable,
  remove,
  countByRole,
};