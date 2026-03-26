const express = require("express");
const router = express.Router();
const User = require("../models/User");

/* ── Auth guard middleware ── */
function requireAuth(req, res, next) {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });
  req.userId = userId;
  next();
}

/**
 * POST /api/user/address
 * Updates user delivery addresses (home, office).
 */
router.post('/address', requireAuth, async (req, res) => {
  try {
    const { home, office } = req.body;
    const updateData = {};

    if (home !== undefined) updateData["addresses.home"] = home.trim();
    if (office !== undefined) updateData["addresses.office"] = office.trim();

    await User.findByIdAndUpdate(req.userId, { $set: updateData });
    res.json({ success: true, message: "Address updated successfully" });
  } catch (err) {
    console.error("Error saving address:", err);
    res.status(500).json({ message: "Error saving address" });
  }
});

module.exports = router;
