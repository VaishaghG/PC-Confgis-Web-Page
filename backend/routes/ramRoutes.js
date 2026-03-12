const express = require("express");
const router = express.Router();
const RAM = require("../models/ramModel");

router.get("/", async (req, res) => {
  const rams = await RAM.find();
  res.json(rams);
});

router.post("/", async (req, res) => {
  const ram = new RAM(req.body);
  await ram.save();
  res.json(ram);
});

module.exports = router;