const express = require("express");
const router = express.Router();
const Order = require("../models/orderModel");

router.get("/", async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

router.post("/", async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.json(order);
});

module.exports = router;