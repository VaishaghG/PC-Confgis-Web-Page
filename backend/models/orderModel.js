const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  custname: String,
  cpu: String,
  gpu: String,
  ram: String,
  storage: String,
  cabinet: String,
  orderdate: Date
});

module.exports = mongoose.model("Order", orderSchema,"custorder");