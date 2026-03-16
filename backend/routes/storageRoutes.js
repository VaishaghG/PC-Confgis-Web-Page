const express = require("express");
const router = express.Router();
const Storage = require("../models/storageModel");

/* Get all Storage */
router.get("/", async (req, res) => {
  try {
    const storages = await Storage.find();
    res.json(storages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Get single Storage by ID */
router.get("/:id", async (req, res) => {
  try {
    const storage = await Storage.findById(req.params.id);
    if (!storage) return res.status(404).json({ error: "Storage not found" });
    res.json(storage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  const storage = new Storage(req.body);
  await storage.save();
  res.json(storage);
});

module.exports = router;