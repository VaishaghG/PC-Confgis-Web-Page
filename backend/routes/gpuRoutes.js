const express = require("express");
const router = express.Router();
const GPU = require("../models/gpuModel");

router.get("/", async (req, res) => {
  const gpus = await GPU.find();
  res.json(gpus);
});

router.post("/", async (req, res) => {
  const gpu = new GPU(req.body);
  await gpu.save();
  res.json(gpu);
});

module.exports = router;