const mongoose = require("mongoose");

const gpuSchema = new mongoose.Schema({
  gpuname: String,
  memory: String,
  baseclock: String,
  clockspeed: String,
  rating: Number,
  price: Number,
  imgpath: String
});

module.exports = mongoose.model("GPU", gpuSchema,"gpuinfo");