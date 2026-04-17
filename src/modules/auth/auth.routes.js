const express = require('express');
const rateLimit = require('express-rate-limit');

const controller = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { loginSchema, registerSchema } = require('./auth.validation');
const { asyncHandler } = require('../../utils/async-handler');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(controller.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(controller.login));
router.get('/firebase-token', requireAuth, asyncHandler(controller.getFirebaseToken));

// OTP — send & verify (rate-limited; no auth required for registration flow)
router.post('/otp/send', authLimiter, asyncHandler(controller.sendOtp));
router.post('/otp/verify', authLimiter, asyncHandler(controller.verifyOtp));

module.exports = router;