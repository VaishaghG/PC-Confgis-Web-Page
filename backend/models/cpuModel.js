const mongoose = require("mongoose");

const cpuSchema = new mongoose.Schema({
  cpuname: String,
  cores: Number,
  threads: Number,
  basespeed: String,
  turbospeed: String,
  memory: String,
  price: Number,
  imgpath: String,
  rating: Number
});

module.exports = mongoose.model("CPU", cpuSchema, "cpuinfo");