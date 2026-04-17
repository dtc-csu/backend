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

  // If requesting admin role, enforce a temporary limit of 2 admin accounts.
  if (role === 'admin') {
    const adminCount = await usersService.countByRole('admin');
    if (adminCount >= 2) {
      return res.status(403).json({ message: 'Admin account limit reached. Only 2 admin accounts are allowed.' });
    }
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

  // Send welcome email (fire-and-forget — do not block the response).
  otpService.sendWelcomeEmail({ email, fullName, username, password }).catch((err) =>
    console.error('[Auth] Welcome email failed:', err.message),
  );

  // Do not auto-login after registration. Instruct client to redirect to login.
  return res.status(201).json({
    message: 'Registration successful. Please log in to continue.',
    data: {
      user: usersService.toPublicUser(user),
      redirectToLogin: true,
    },
  });
};

const login = async (req, res) => {
  const { login, password } = req.body;
  const user = await usersService.findByLogin(login);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  // `disabled` may come from the DB as Buffer (BIT), '0'/'1' strings, or numbers; coerce safely.
  const disabledVal = Buffer.isBuffer(user.disabled) ? (user.disabled.length ? user.disabled[0] : 0) : user.disabled;
  if (Number(disabledVal) === 1) {
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

// ── OTP endpoints ─────────────────────────────────────────────────────────────

const otpService = require('../../services/otp.service');

/**
 * POST /auth/otp/send
 * Body: { email?, phone? }  — at least one required.
 * Generates one code and delivers it to both channels simultaneously.
 * Returns 429 if the 3-minute resend cooldown has not elapsed.
 */
const sendOtp = async (req, res) => {
  const email = (req.body.email || '').trim() || null;
  const phone = (req.body.phone || '').trim() || null;
  const name = (req.body.name || '').trim() || null;

  if (!email && !phone) {
    return res.status(400).json({ message: 'Provide at least an email or phone number.' });
  }

  try {
    const results = await otpService.sendOtpToTargets(email, phone, name);
    return res.json({
      message: 'OTP sent to the provided contact details.',
      data: results,
    });
  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({ message: err.message, remainingSec: err.remainingSec ?? 180 });
    }
    throw err; // bubble to asyncHandler → 500
  }
};

/**
 * POST /auth/otp/verify
 * Body: { target: string (email or phone), code: string }
 */
const verifyOtp = async (req, res) => {
  const target = (req.body.target || '').trim();
  const code = (req.body.code || '').trim();

  if (!target || !code) {
    return res.status(400).json({ message: 'Provide target (email or phone) and the OTP code.' });
  }

  const result = otpService.verifyOtp(target, code);

  if (!result.valid) {
    return res.status(400).json({ message: result.reason });
  }

  return res.json({ message: 'OTP verified successfully.' });
};

module.exports = {
  getFirebaseToken,
  register,
  login,
  sendOtp,
  verifyOtp,
};