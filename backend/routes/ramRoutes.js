const express = require("express");
const router = express.Router();
const RAM = require("../models/ramModel");

/* Get all RAMs */
router.get("/", async (req, res) => {
  try {
    const rams = await RAM.find();
    res.json(rams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Get single RAM by ID */
router.get("/:id", async (req, res) => {
  try {
    const ram = await RAM.findById(req.params.id);
    if (!ram) return res.status(404).json({ error: "RAM not found" });
    res.json(ram);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const ram = new RAM(req.body);
  await ram.save();
  res.json(ram);
});

module.exports = router;