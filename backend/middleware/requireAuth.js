const User = require('../models/User');

async function requireAuth(req, res, next) {
  const sessionUserId = req.session && req.session.userId;
  const passportUserId = req.user && req.user._id;
  const userId = passportUserId || sessionUserId;

  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      if (req.session) {
        delete req.session.userId;
      }
      req.user = null;
      return res.status(401).json({ message: 'Not authenticated' });
    }

    req.user = user;
    if (req.session) {
      req.session.userId = user._id;
    }
    next();
  } catch (error) {
    console.error('requireAuth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = requireAuth;
