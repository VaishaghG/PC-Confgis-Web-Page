require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
require("./passport-config")();

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
const SESSION_SECRET = process.env.SESSION_SECRET || "pcconfig-dev-session-secret";

app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

app.use("/images", express.static(path.join(__dirname, "../frontend/images")));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/pc_config_db");
    console.log("MongoDB Connected");

    const User = require("./models/User");
    const bcrypt = require("bcryptjs");
    const adminEmail = "admin@pcconfig.com";
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        username: "Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin"
      });
      console.log("Default admin created: admin@pcconfig.com / admin123");
    }

    app.listen(5000, "0.0.0.0", () => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

app.use("/cpus", cpuRoutes);
app.use("/gpus", gpuRoutes);
app.use("/rams", ramRoutes);
app.use("/storages", storageRoutes);
app.use("/cabinets", cabinetRoutes);

app.use("/users", userRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/builds", buildsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/user", apiUserRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(express.static(path.join(__dirname, "..")));

app.use((req, res) => {
  if (!req.path.startsWith("/api") && !req.path.match(/\.[a-z]{2,4}$/i)) {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

startServer();
