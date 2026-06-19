// backend/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;    // 15 minutes

// ── Helpers ────────────────────────────────────────────────────────────────────

function sign_token(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function generate_verification_code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Admin login ────────────────────────────────────────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required.' });
    }

    if (email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase()) {
      return res.status(403).json({ msg: 'Invalid admin credentials.' });
    }

    const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(404).json({ msg: 'Admin account not found.' });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ msg: 'Invalid admin credentials.' });

    const token = sign_token({
      id:        admin._id,
      role:      'admin',
      full_name: admin.full_name || 'System Admin',
    });
    res.json({ token });
  } catch (err) {
    console.error('[admin/login]', err);
    res.status(500).json({ msg: 'Server error during admin login.' });
  }
});

// ── Customer registration ──────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, contact_number } = req.body;

    if (!email || !password || !full_name || !contact_number) {
      return res.status(400).json({ msg: 'All fields are required.' });
    }

    const normalized_email = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalized_email });
    if (existing) {
      return res.status(409).json({ msg: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verification_code = generate_verification_code();
    const verification_expires_at = new Date(Date.now() + VERIFICATION_TTL_MS);

    await User.create({
      email: normalized_email,
      password_hash,
      full_name: full_name.trim(),
      contact_number: contact_number.trim(),
      role: 'customer',
      verified: false,
      verification_code,
      verification_expires_at,
    });

    // In production: send verification_code via email.
    // In development: return it so the UI can display it.
    res.status(201).json({
      msg: 'Registration successful. Verify your email to continue.',
      email: normalized_email,
      verification_code, // Remove in production
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ msg: 'Server error during registration.' });
  }
});

// ── Verify email ───────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ msg: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'customer' });
    if (!user) return res.status(404).json({ msg: 'Account not found.' });

    if (user.verified) {
      return res.json({ msg: 'Email is already verified.' });
    }

    if (!user.verification_code || new Date() > user.verification_expires_at) {
      return res.status(410).json({ msg: 'Verification code expired. Request a new one.' });
    }

    if (user.verification_code !== code.trim()) {
      return res.status(400).json({ msg: 'Verification code does not match.' });
    }

    await User.findByIdAndUpdate(user._id, {
      verified:                true,
      verification_code:       null,
      verification_expires_at: null,
    });

    res.json({ msg: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('[verify]', err);
    res.status(500).json({ msg: 'Server error during email verification.' });
  }
});

// ── Resend verification code ───────────────────────────────────────────────────
router.post('/resend-verify', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'customer' });
    if (!user) return res.status(404).json({ msg: 'Account not found.' });
    if (user.verified) return res.json({ msg: 'Email is already verified.' });

    const verification_code = generate_verification_code();
    const verification_expires_at = new Date(Date.now() + VERIFICATION_TTL_MS);

    await User.findByIdAndUpdate(user._id, { verification_code, verification_expires_at });

    res.json({
      msg: `Verification code resent to ${email}.`,
      verification_code, // Remove in production
    });
  } catch (err) {
    console.error('[resend-verify]', err);
    res.status(500).json({ msg: 'Server error resending verification code.' });
  }
});

// ── Customer login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'customer' });
    if (!user) return res.status(404).json({ msg: 'Invalid email or password.' });

    // Account lockout check
    if (user.locked_until && new Date() < user.locked_until) {
      const minutes_left = Math.ceil((user.locked_until - Date.now()) / 60000);
      return res.status(423).json({
        msg: `Account locked after too many failed attempts. Try again in ${minutes_left} minute${minutes_left > 1 ? 's' : ''}.`,
        locked: true,
      });
    }

    // Email verification check
    if (!user.verified) {
      return res.status(403).json({
        msg: 'Email is not verified. Check your inbox or resend the code.',
        needs_verification: true,
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const failed_attempts = (user.failed_attempts || 0) + 1;
      const locked = failed_attempts >= MAX_FAILED_ATTEMPTS;
      await User.findByIdAndUpdate(user._id, {
        failed_attempts: locked ? 0 : failed_attempts,
        locked_until:    locked ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      });

      return res.status(401).json({
        msg: locked
          ? 'Too many failed attempts. Account locked for 15 minutes.'
          : 'Invalid email or password.',
      });
    }

    // Reset failed attempts on success
    await User.findByIdAndUpdate(user._id, { failed_attempts: 0, locked_until: null });

    const token = sign_token({
      id:             user._id,
      role:           'customer',
      full_name:      user.full_name,
      contact_number: user.contact_number,
    });

    res.json({ token, full_name: user.full_name, contact_number: user.contact_number });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ msg: 'Server error during login.' });
  }
});

// ── Password reset request ─────────────────────────────────────────────────────
router.post('/reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'customer' });

    // Return 200 even if user not found (prevents email enumeration)
    if (!user) {
      return res.json({ msg: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Short-lived 30-minute reset token
    const reset_token = sign_token({ id: user._id, purpose: 'reset' }, '30m');

    // In production: email this token as a link. For development: return it.
    res.json({
      msg: 'Password reset token generated.',
      reset_token, // Remove in production
    });
  } catch (err) {
    console.error('[reset-request]', err);
    res.status(500).json({ msg: 'Server error requesting password reset.' });
  }
});

// ── Password reset apply ───────────────────────────────────────────────────────
router.post('/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ msg: 'Reset token is invalid or has expired.' });
    }

    if (payload.purpose !== 'reset') {
      return res.status(400).json({ msg: 'Invalid token purpose.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(payload.id, {
      password_hash,
      failed_attempts: 0,
      locked_until:    null,
    });

    res.json({ msg: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('[reset]', err);
    res.status(500).json({ msg: 'Server error applying password reset.' });
  }
});

// ── Change password (authenticated customer) ───────────────────────────────────
router.post('/change-password', async (req, res) => {
  try {
    const { email, current_password, new_password } = req.body;

    if (!email || !current_password || !new_password) {
      return res.status(400).json({ msg: 'All fields are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ msg: 'New password must be at least 8 characters.' });
    }

    if (current_password === new_password) {
      return res.status(400).json({ msg: 'New password must be different from current password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'customer' });
    if (!user) return res.status(404).json({ msg: 'Account not found.' });

    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) return res.status(401).json({ msg: 'Current password is incorrect.' });

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.findByIdAndUpdate(user._id, { password_hash, failed_attempts: 0, locked_until: null });

    res.json({ msg: 'Password changed successfully.' });
  } catch (err) {
    console.error('[change-password]', err);
    res.status(500).json({ msg: 'Server error changing password.' });
  }
});

export default router;
