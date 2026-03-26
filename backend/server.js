require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("./passport-config")(passport); // Initialize passport strategies

const cpuRoutes = require("./routes/cpuRoutes");
const gpuRoutes = require("./routes/gpuRoutes");
const ramRoutes = require("./routes/ramRoutes");
const storageRoutes = require("./routes/storageRoutes");
const cabinetRoutes = require("./routes/cabinetRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cart");
const buildsRoutes = require("./routes/builds");
const productRoutes = require("./routes/productRoutes");
const apiUserRoutes = require("./routes/apiUserRoutes");

const app = express();

app.use(cors({
  origin: true, // Dynamically allow the request origin
  credentials: true,
  optionsSuccessStatus: 200
}));

const path = require('path');

app.use(express.json());

// Serve images directly from backend
app.use("/images", express.static(path.join(__dirname, "../frontend/images")));

const crypto = require('crypto');
// A fresh random secret on every restart ensures ALL existing session cookies
// become invalid immediately — no user can stay logged in across restarts.
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 24h
  }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Product Category Routes
app.use("/cpus", cpuRoutes);
app.use("/gpus", gpuRoutes);
app.use("/rams", ramRoutes);
app.use("/storages", storageRoutes);
app.use("/cabinets", cabinetRoutes);

// User Routes
app.use("/users", userRoutes);

// Order API Routes
app.use("/api/orders", orderRoutes);

// API routes (must come before static/catch-all)
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/builds", buildsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/user", apiUserRoutes);

// Serve the frontend as static files from port 5000
// e.g. http://localhost:5000/frontend/index.html
app.use(express.static(path.join(__dirname, '..')));

// Catch-all: for non-API, non-asset paths → serve index.html (SPA fallback)
app.use((req, res) => {
  if (!req.path.startsWith('/api') && !req.path.match(/\.[a-z]{2,4}$/i)) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
