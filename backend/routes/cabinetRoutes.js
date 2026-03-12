const express = require("express");
const router = express.Router();
const Cabinet = require("../models/cabinetModel");

router.get("/", async (req, res) => {
  const cabinets = await Cabinet.find();
  res.json(cabinets);
});

router.post("/", async (req, res) => {
  const cabinet = new Cabinet(req.body);
  await cabinet.save();
  res.json(cabinet);
});

module.exports = router;