require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const cpuRoutes = require("./routes/cpuRoutes");
const gpuRoutes = require("./routes/gpuRoutes");
const ramRoutes = require("./routes/ramRoutes");
const storageRoutes = require("./routes/storageRoutes");
const cabinetRoutes = require("./routes/cabinetRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.use("/cpus", cpuRoutes);
app.use("/gpus", gpuRoutes);
app.use("/rams", ramRoutes);
app.use("/storages", storageRoutes);
app.use("/cabinets", cabinetRoutes);
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});