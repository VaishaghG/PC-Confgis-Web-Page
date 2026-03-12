const express = require("express");
const router = express.Router();
const Storage = require("../models/storageModel");

router.get("/", async (req, res) => {
  const storages = await Storage.find();
  res.json(storages);
});

router.post("/", async (req, res) => {
  const storage = new Storage(req.body);
  await storage.save();
  res.json(storage);
});

module.exports = router;