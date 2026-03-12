const mongoose = require("mongoose");

const ramSchema = new mongoose.Schema({
  ramname: String,
  ramsize: String,
  ramtype: String,
  quantity: Number,
  ramspeed: String,
  price: Number,
  imgpath: String,
  rating: Number
});

module.exports = mongoose.model("RAM", ramSchema,"raminfo");