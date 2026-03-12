const mongoose = require("mongoose");

const cabinetSchema = new mongoose.Schema({
  brand: String,
  panel: String,
  ctype: String,
  color: String,
  price: Number,
  imgpath: String,
  rating: Number
});

module.exports = mongoose.model("Cabinet", cabinetSchema,"cabinetinfo");