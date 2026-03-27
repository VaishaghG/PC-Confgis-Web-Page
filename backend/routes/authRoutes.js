const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || '';
const DEFAULT_REDIRECT_PATH = '/';
const DEFAULT_LOGIN_PATH = '/login.html';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;

function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role || 'customer',
    username: user.username || 'User'
  };
}

/**
 * Helper to get the correct frontend base URL.
 * It tries to get the origin from the request Referer or Host headers if possible,
 * otherwise falls back to the environment variable.
 */
function getFrontendBase(req) {
  if (req.headers.origin) return req.headers.origin;
  if (req.headers.referer) {
    try {
      const url = new URL(req.headers.referer);
      return url.origin;
    } catch (e) {}
  }
  if (req.headers.host) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${proto}://${req.headers.host}`;
  }
  return FRONTEND_BASE_URL;
}

// ── CHECK AUTH STATUS ──
router.get('/me', async (req, res) => {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) {
    return res.json({ loggedIn: false });
  }

  try {
    const User = require('../models/User'); // Re-importing User model as per instruction, though already imported above
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ loggedIn: false });
    }
    res.json({ 
      loggedIn: true, 
      user: serializeUser(user),
      name: user.username || 'User',
      role: user.role || 'customer'
    });
  } catch(e) {
    res.json({ loggedIn: false });
  }
});

// ── GET FULL PROFILE (protected) ──
router.get('/profile', async (req, res) => {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      name: user.username || 'User',
      email: user.email || '',
      phone: user.phone || user.phoneno || '',
      dob: user.dob || '',
      addresses: user.addresses || { home: '', office: '' },
      role: user.role || 'customer'
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── LOCAL Registration ──
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: String(username).trim(), email: normalizedEmail, password: hashedPassword });
    await newUser.save();

    // Auto-login after signup
    req.login(newUser, (err) => {
      if (err) return res.status(500).json({ message: 'Error logging in after signup' });
      req.session.userId = newUser._id;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        return res.json({
          success: true,
          message: 'Signup successful',
          user: serializeUser(newUser)
        });
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── LOCAL Login ──
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!user) return res.status(401).json({ message: info.message || 'Login failed' });
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Login error' });
      req.session.userId = user._id;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        const redirect = user.role === 'admin' ? '/admin/dashboard.html' : '/';
        return res.json({
          success: true,
          message: 'Login successful',
          user: serializeUser(user),
          redirect
        });
      });
    });
  })(req, res, next);
});

// ── LOGOUT ──
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Error logging out' });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// ── UPDATE PROFILE ──
router.post('/update-profile', async (req, res) => {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const { username, phone, dob, address } = req.body;
    const normalizedPhone = String(phone || '').trim().replace(/[\s\-()]/g, '');
    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    await User.findByIdAndUpdate(userId, {
      username: String(username || '').trim(),
      phone: normalizedPhone,
      dob,
      address: String(address || '').trim()
    });
    res.json({ message: 'Profile updated' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── CHANGE PASSWORD ──
router.post('/change-password', async (req, res) => {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Password change not available for this account.' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// â”€â”€ FORGOT PASSWORD RESET (email + new password) â”€â”€
router.post('/forgot-password-reset', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GOOGLE OAuth ──
router.get('/google', (req, res, next) => {
  let redirectPath = DEFAULT_REDIRECT_PATH;
  if (req.query.redirect) {
    redirectPath = req.query.redirect;
  }

  // Detect current origin to ensure we redirect back to the same port
  const currentOrigin = getFrontendBase(req);
  const stateStr = Buffer.from(JSON.stringify({ 
    path: redirectPath,
    origin: currentOrigin
  })).toString('base64');
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: stateStr
  })(req, res, next);
});

router.get('/google/callback', 
  (req, res, next) => {
    let path = DEFAULT_REDIRECT_PATH;
    let origin = FRONTEND_BASE_URL;
    try {
      if (req.query.state) {
        const decoded = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
        if (decoded.path) path = decoded.path;
        if (decoded.origin) origin = decoded.origin;
      }
    } catch(e) {}
    
    // Save decoded info to req for the next middleware
    req.authPath = path;
    req.authOrigin = origin;

    passport.authenticate('google', { 
      failureRedirect: `${req.authOrigin || getFrontendBase(req)}${DEFAULT_LOGIN_PATH}?error=google` 
    })(req, res, next);
  },
  (req, res) => {
    // Explicitly set the session ID
    if (req.user) {
      req.session.userId = req.user._id;
      
      // Force session save before redirecting to guarantee store persistence
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        const targetPath = req.authPath || DEFAULT_REDIRECT_PATH;
        const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
        const base = req.authOrigin || getFrontendBase(req);
        res.redirect(`${base}${normalizedTarget}`);
      });
    } else {
      const targetPath = req.authPath || DEFAULT_REDIRECT_PATH;
      const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      const base = req.authOrigin || getFrontendBase(req);
      res.redirect(`${base}${normalizedTarget}`);
    }
  }
);

module.exports = router;
