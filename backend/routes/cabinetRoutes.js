const express = require("express");
const router = express.Router();
const Cabinet = require("../models/cabinetModel");

/* Get all Cabinets */
router.get("/", async (req, res) => {
  try {
    const cabinets = await Cabinet.find();
    res.json(cabinets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Get single Cabinet by ID */
router.get("/:id", async (req, res) => {
  try {
    const cabinet = await Cabinet.findById(req.params.id);
    if (!cabinet) return res.status(404).json({ error: "Cabinet not found" });
    res.json(cabinet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const cabinet = new Cabinet(req.body);
  await cabinet.save();
  res.json(cabinet);
});

module.exports = router;