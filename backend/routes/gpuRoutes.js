const express = require("express");
const router = express.Router();
const GPU = require("../models/gpuModel");

/* Get all GPUs */
router.get("/", async (req, res) => {
  try {
    const gpus = await GPU.find();
    res.json(gpus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Get single GPU by ID */
router.get("/:id", async (req, res) => {
  try {
    const gpu = await GPU.findById(req.params.id);
    if (!gpu) return res.status(404).json({ error: "GPU not found" });
    res.json(gpu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const gpu = new GPU(req.body);
  await gpu.save();
  res.json(gpu);
});

module.exports = router;