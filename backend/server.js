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

const app = express();

app.use(cors({
  origin: true, // Dynamically allow the request origin
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_pc_config_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using https
    httpOnly: true,
    sameSite: 'lax', // Required for OAuth redirects to retain the cookie
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
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

// User & Order Routes
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);

// API Service Routes
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/builds", buildsRoutes);
app.use("/api/products", productRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
