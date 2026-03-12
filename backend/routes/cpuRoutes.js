const express = require("express");
const router = express.Router();
const CPU = require("../models/cpuModel");

/* Get all CPUs */

router.get("/", async (req, res) => {
  try {
    const cpus = await CPU.find();
    res.json(cpus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;