const driverService = require('../drivers/drivers.service');
const usersService = require('../users/users.service');
const { createCustomToken } = require('../../config/firebase-admin');
const { withTransaction } = require('../../config/database');
const { comparePassword, hashPassword, signToken } = require('../../utils/auth');

const register = async (req, res) => {
  const { fullName, contactNumber, email, username, password, role, licenseNumber, trikeId, picFilePath } = req.body;

  const existingByEmail = await usersService.findByLogin(email);
  const existingByUsername = await usersService.findByLogin(username);

  if (existingByEmail || existingByUsername) {
    return res.status(409).json({ message: 'A user with that email or username already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const userId = await withTransaction(async (db) => {
    const createdUserId = await usersService.create(
      {
        fullName,
        contactNumber,
        email,
        username,
        picFilePath,
        passwordHash,
        role,
      },
      db,
    );

    if (role === 'driver') {
      await driverService.createProfile({ driverId: createdUserId, licenseNumber, trikeId }, db);
    }

    return createdUserId;
  });

  const user = await usersService.findById(userId);
  const token = signToken({ userId, role: user.role });

  return res.status(201).json({
    message: 'Registration successful.',
    data: {
      token,
      user: usersService.toPublicUser(user),
    },
  });
};

const login = async (req, res) => {
  const { login, password } = req.body;
  const user = await usersService.findByLogin(login);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (Boolean(user.disabled)) {
    return res.status(403).json({ message: 'This account has been disabled.' });
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken({ userId: user.userid, role: user.role });

  return res.json({
    message: 'Login successful.',
    data: {
      token,
      user: usersService.toPublicUser(user),
    },
  });
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

module.exports = {
  getFirebaseToken,
  register,
  login,
};