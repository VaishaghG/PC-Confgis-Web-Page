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

/* Get single CPU by ID */
router.get("/:id", async (req, res) => {
  try {
    const cpu = await CPU.findById(req.params.id);
    if (!cpu) return res.status(404).json({ error: "CPU not found" });
    res.json(cpu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;