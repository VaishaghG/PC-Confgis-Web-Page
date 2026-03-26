const express = require("express");
const router  = express.Router();
const Order   = require("../models/orderModel");

/* ── Auth guard middleware ── */
function requireAuth(req, res, next) {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });
  req.userId = userId;
  next();
}

const Cabinet = require("../models/cabinetModel");
const Product = require("../models/Product");

/* ─────────────────────────────────────────────────────────────
   POST /api/orders/create
   Called by payment.js BEFORE redirecting to success page.
   Body: { items, builds, totalAmount, orderId }
───────────────────────────────────────────────────────────── */
router.post("/create", requireAuth, async (req, res) => {
  try {
    const { items = [], builds = [], totalAmount = 0, orderId, deliveryAddress: addressType } = req.body;

    // Fetch user for address snapshot
    const User = require("../models/User");
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Resolve address snapshot
    const snapshotAddress = addressType === "office" 
      ? user.addresses?.office 
      : user.addresses?.home;

    if (!snapshotAddress) {
      return res.status(400).json({ message: "Delivery address is missing or invalid" });
    }

    // ── UNIFY BUILDS INTO ITEMS ──
    // We convert incoming 'builds' into 'items' with type: 'build'
    // This provides a flattened snapshot for the dashboard.
    const unifiedItems = [...items.map(item => ({ ...item, type: 'item' }))];

    builds.forEach(build => {
      // Flatten components if they are nested (as seen in frontend cart data)
      const components = build.components || {};
      
      unifiedItems.push({
        type: 'build',
        productType: 'build',
        name: build.name || "Custom PC Build",
        price: parseFloat(build.price) || 0,
        quantity: 1,

        cpu: components.cpu || build.cpu || "",
        gpu: components.gpu || build.gpu || "",
        ram: components.ram || build.ram || "",
        storage: components.storage || build.storage || "",
        cabinet: {
          name: components.cabinet?.name || build.cabinet?.name || "",
          image: components.cabinet?.image || build.cabinet?.image || ""
        }
      });
    });

    const order = new Order({
      userId:      req.userId,
      items:       unifiedItems,
      builds:      [], // We are migrating builds into items
      totalAmount: parseFloat(totalAmount) || 0,
      status:      "paid",
      deliveryAddress: snapshotAddress,
      orderId:     orderId || ""
    });

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(400).json({ success: false, message: err.message || "Failed to save order" });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/orders/my
   Returns all orders for the logged-in user, newest first.
───────────────────────────────────────────────────────────── */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;