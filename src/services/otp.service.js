'use strict';

const nodemailer = require('nodemailer');
const { config } = require('../config/env');

// ── Constants ─────────────────────────────────────────────────────────────────
const OTP_TTL_MS = 3 * 60 * 1000;        // code expires after 3 minutes
const RESEND_COOLDOWN_MS = 3 * 60 * 1000; // minimum 3 minutes between resends

// ── In-memory OTP store ───────────────────────────────────────────────────────
// Key: normalised e-mail or phone string
// Value: { code: string, expiresAt: number, sentAt: number }
const _store = new Map();

// ── In-memory reset-permit store ─────────────────────────────────────────────
// Set after successful OTP verification so the password-reset endpoint can
// confirm the user completed the OTP challenge.  Expires in 10 minutes.
// Key: normalised target (email or phone). Value: { expiresAt: number }
const _resetPermitStore = new Map();
const RESET_PERMIT_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Clean up expired entries every minute so the Maps do not grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _store.entries()) {
    if (entry.expiresAt < now) _store.delete(key);
  }
  for (const [key, entry] of _resetPermitStore.entries()) {
    if (entry.expiresAt < now) _resetPermitStore.delete(key);
  }
}, 60_000).unref();

// ── Helpers ───────────────────────────────────────────────────────────────────
const _normalize = (target) => target.trim().toLowerCase();

const _generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

/**
 * Normalise a Philippine mobile number to E.164 format (+63XXXXXXXXXX).
 * Accepts: 09XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX
 */
const _normalizePhone = (phone) => {
  let digits = phone.trim().replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '63' + digits.slice(1);
  return '+' + digits;
};

// ── Core OTP logic ────────────────────────────────────────────────────────────

/**
 * Create one OTP code and store it under both email and phone keys so the
 * user gets the *same* code on both channels and can use either to verify.
 *
 * Throws a 429-tagged error if the cooldown has not elapsed yet.
 * @param {string|null} email
 * @param {string|null} phone
 * @returns {string} the generated 6-digit code
 */
const createOtp = (email, phone) => {
  const emailKey = email ? _normalize(email) : null;
  const phoneKey = phone ? _normalize(phone) : null;

  // Check cooldown on either key.
  const now = Date.now();
  for (const key of [emailKey, phoneKey]) {
    if (!key) continue;
    const entry = _store.get(key);
    if (entry && now < entry.sentAt + RESEND_COOLDOWN_MS) {
      const remainingSec = Math.ceil((entry.sentAt + RESEND_COOLDOWN_MS - now) / 1000);
      const err = new Error(
        `Please wait ${remainingSec} second${remainingSec !== 1 ? 's' : ''} before requesting a new OTP.`,
      );
      err.statusCode = 429;
      err.remainingSec = remainingSec;
      throw err;
    }
  }

  const code = _generateCode();
  const entry = { code, expiresAt: now + OTP_TTL_MS, sentAt: now };

  if (emailKey) _store.set(emailKey, entry);
  if (phoneKey) _store.set(phoneKey, entry);

  return code;
};

/**
 * Verify a submitted OTP against a given target (email or phone).
 * If valid, the entry is removed so the code cannot be reused.
 */
const verifyOtp = (target, code) => {
  const key = _normalize(target);
  const entry = _store.get(key);

  if (!entry) {
    return { valid: false, reason: 'No OTP was requested or it has already expired.' };
  }
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (entry.code !== String(code).trim()) {
    return { valid: false, reason: 'Incorrect OTP code.' };
  }

  // Invalidate after successful verification.
  _store.delete(key);
  return { valid: true };
};

/**
 * Mark that a given target (email or phone) has successfully completed OTP
 * verification for the purpose of a password reset.  Expires in 10 minutes.
 */
const markVerifiedForReset = (target) => {
  _resetPermitStore.set(_normalize(target), { expiresAt: Date.now() + RESET_PERMIT_TTL_MS });
};

/**
 * Check whether a reset permit exists for [target] and consume it.
 * Returns true if the permit was valid, false otherwise.
 */
const consumeResetPermit = (target) => {
  const key = _normalize(target);
  const entry = _resetPermitStore.get(key);
  _resetPermitStore.delete(key); // always delete (one-shot)
  if (!entry || Date.now() > entry.expiresAt) return false;
  return true;
};

// ── SMS channel — SMS API PH ──────────────────────────────────────────────────

const sendSms = async (phone, code) => {
  const apiKey = config.smsApiPh?.apiKey;
  if (!apiKey) {
    console.warn('[OTP] SMS_API_PH_KEY is not configured — skipping SMS delivery.');
    return { skipped: true };
  }

  const recipient = _normalizePhone(phone);

  try {
    const res = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient,
        message:
          `Your Book A Trike verification code is: ${code}. ` +
          'Valid for 3 minutes. Do not share this code with anyone.',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[OTP] SMS send failed (${res.status}): ${text}`);
      return { ok: false, status: res.status };
    }

    return { ok: true };
  } catch (err) {
    console.error('[OTP] SMS network error:', err.message);
    return { ok: false, error: err.message };
  }
};

// ── Email channel — Nodemailer (SMTP) ─────────────────────────────────────────

let _transporter = null;

const _getTransporter = () => {
  if (_transporter) return _transporter;
  const { host, port, user, pass } = config.mailer || {};
  if (!user || !pass) return null;
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return _transporter;
};

const sendEmail = async (email, code, name) => {
  const transporter = _getTransporter();
  if (!transporter) {
    console.warn('[OTP] Mailer credentials not configured — skipping email delivery.');
    return { skipped: true };
  }

  try {
    await transporter.sendMail({
      from: config.mailer.from,
      to: email,
      subject: `Your Verification Code is: ${code}`,
      text: [
        `Hi ${name || 'there'},`,
        '',
        `Your Verification Code is: ${code}`,
        '',
        'This code is valid for 3 minutes. Do not share it with anyone.',
        '',
        '- Grabatrike Team',
      ].join('\n'),
    });
    return { ok: true };
  } catch (err) {
    console.error('[OTP] Email delivery error:', err.message);
    return { ok: false, error: err.message };
  }
};

// ── Welcome email — sent after successful registration ────────────────────────

const sendWelcomeEmail = async ({ email, fullName, username, password }) => {
  const transporter = _getTransporter();
  if (!transporter) {
    console.warn('[Mailer] Credentials not configured — skipping welcome email.');
    return { skipped: true };
  }

  try {
    await transporter.sendMail({
      from: config.mailer.from,
      to: email,
      subject: 'Welcome to Grabatrike – Account Created Successfully',
      text: [
        `Hi ${fullName},`,
        '',
        'Congratulations, your account has been created successfully and we are pleased to welcome you to our community.',
        '',
        'We recommend you keep this e-mail to store your credentials.',
        '',
        'Your credentials:',
        `Username: ${username}`,
        `Password: ${password}`,
        `E-mail: ${email}`,
        'You can now sign in to Grabatrike app with your username and password.',
        'Thank you for your trust in our service,',
        'Grabatrike Team',
      ].join('\n'),
    });
    return { ok: true };
  } catch (err) {
    console.error('[Mailer] Welcome email error:', err.message);
    return { ok: false, error: err.message };
  }
};

// ── High-level helper used by the controller ──────────────────────────────────

/**
 * Send an OTP to both phone and email simultaneously.
 * Returns a results map: { sms, email } — each value is the delivery result.
 */
const sendOtpToTargets = async (email, phone, name) => {
  const code = createOtp(email, phone); // throws 429 if still on cooldown

  const [smsResult, emailResult] = await Promise.all([
    phone ? sendSms(phone, code) : Promise.resolve({ skipped: true }),
    email ? sendEmail(email, code, name) : Promise.resolve({ skipped: true }),
  ]);

  // If every attempted channel was either skipped or errored, surface that as a
  // real error so the caller (and the Flutter app) knows nothing was delivered.
  const attempted = [];
  if (email) attempted.push({ channel: 'email', result: emailResult });
  if (phone) attempted.push({ channel: 'sms', result: smsResult });

  const allFailed = attempted.every(
    ({ result }) => result.skipped || result.ok === false,
  );

  if (allFailed) {
    const skipped = attempted.every(({ result }) => result.skipped);
    const err = new Error(
      skipped
        ? 'OTP delivery is not configured on this server. Contact support.'
        : 'OTP could not be delivered to any of the provided contact details. Try again later.',
    );
    err.statusCode = 503;
    throw err;
  }

  return { sms: smsResult, email: emailResult };
};

module.exports = { sendOtpToTargets, verifyOtp, markVerifiedForReset, consumeResetPermit, sendWelcomeEmail };
