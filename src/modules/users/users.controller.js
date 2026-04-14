const usersService = require('./users.service');
const driversService = require('../drivers/drivers.service');
const { withTransaction } = require('../../config/database');
const { createCustomToken } = require('../../config/firebase-admin');
const { hashPassword } = require('../../utils/auth');

const canManageUser = (requestUser, targetUserId) => requestUser.role === 'admin' || requestUser.userId === targetUserId;

const ensureIdentityAvailable = async ({ email, username, excludeUserId }) => {
  const conflict = await usersService.findIdentityConflict({ email, username, excludeUserId });

  if (!conflict) {
    return null;
  }

  return 'A user with that email or username already exists.';
};

const getCurrentUser = async (req, res) => {
  const user = await usersService.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ data: usersService.toPublicUser(user) });
};

const getFirebaseToken = async (req, res) => {
  const user = await usersService.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const firebaseToken = await createCustomToken({
    userId: user.userid,
    role: user.role,
  });

  return res.json({
    data: {
      token: firebaseToken,
      uid: String(user.userid),
      role: user.role,
    },
  });
};

const listUsers = async (req, res) => {
  const users = await usersService.list(req.query);
  return res.json({ data: users.map(usersService.toPublicUser) });
};

const createUser = async (req, res) => {
  const { fullName, contactNumber, email, username, password, role, disabled, licenseNumber, trikeId } = req.body;

  const conflictMessage = await ensureIdentityAvailable({ email, username });

  if (conflictMessage) {
    return res.status(409).json({ message: conflictMessage });
  }

  const passwordHash = await hashPassword(password);
  const userId = await withTransaction(async (db) => {
    const createdUserId = await usersService.create(
      {
        fullName,
        contactNumber,
        email,
        username,
        passwordHash,
        role,
      },
      db,
    );

    if (role === 'driver') {
      await driversService.createProfile(
        {
          driverId: createdUserId,
          licenseNumber,
          trikeId,
          status: 'offline',
        },
        db,
      );
    }

    if (typeof disabled === 'boolean') {
      await usersService.update(createdUserId, { disabled }, db);
    }

    return createdUserId;
  });

  const user = await usersService.findById(userId);
  return res.status(201).json({
    message: 'User created successfully.',
    data: usersService.toPublicUser(user),
  });
};

const getUserById = async (req, res) => {
  if (!canManageUser(req.user, Number(req.params.userId))) {
    return res.status(403).json({ message: 'You can only view your own account.' });
  }

  const user = await usersService.findById(req.params.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ data: usersService.toPublicUser(user) });
};

const updateUser = async (req, res) => {
  const targetUserId = Number(req.params.userId);
  const isAdmin = req.user.role === 'admin';

  if (!canManageUser(req.user, targetUserId)) {
    return res.status(403).json({ message: 'You can only update your own account.' });
  }

  const payload = { ...req.body };

  if (payload.email || payload.username) {
    const conflictMessage = await ensureIdentityAvailable({
      email: payload.email,
      username: payload.username,
      excludeUserId: targetUserId,
    });

    if (conflictMessage) {
      return res.status(409).json({ message: conflictMessage });
    }
  }

  if (!isAdmin) {
    delete payload.role;
    delete payload.disabled;
  }

  const updated = await usersService.update(targetUserId, payload);

  if (!updated) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const user = await usersService.findById(targetUserId);
  return res.json({ message: 'User updated successfully.', data: usersService.toPublicUser(user) });
};

const replaceUserProfile = async (req, res) => {
  const targetUserId = Number(req.params.userId);

  if (!canManageUser(req.user, targetUserId)) {
    return res.status(403).json({ message: 'You can only replace your own profile.' });
  }

  const conflictMessage = await ensureIdentityAvailable({
    email: req.body.email,
    username: req.body.username,
    excludeUserId: targetUserId,
  });

  if (conflictMessage) {
    return res.status(409).json({ message: conflictMessage });
  }

  const updated = await usersService.update(targetUserId, {
    fullName: req.body.fullName,
    contactNumber: req.body.contactNumber,
    email: req.body.email,
    username: req.body.username,
  });

  if (!updated) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const user = await usersService.findById(targetUserId);
  return res.json({
    message: 'User profile replaced successfully.',
    data: usersService.toPublicUser(user),
  });
};

const deleteUser = async (req, res) => {
  const userId = Number(req.params.userId);
  const existingUser = await usersService.findById(userId);

  if (!existingUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const deleted = await withTransaction(async (db) => {
    if (existingUser.role === 'driver') {
      await driversService.remove(userId, db);
    }

    return usersService.remove(userId, db);
  });

  if (!deleted) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(204).send();
};

module.exports = {
  createUser,
  getFirebaseToken,
  getCurrentUser,
  listUsers,
  getUserById,
  replaceUserProfile,
  updateUser,
  deleteUser,
};