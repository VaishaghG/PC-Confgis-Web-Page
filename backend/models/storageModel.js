const mongoose = require("mongoose");

const storageSchema = new mongoose.Schema({
  storagename: String,
  capacity: String,
  cache: String,
  price: Number,
  imgpath: String,
  rating: Number
});

module.exports = mongoose.model("Storage", storageSchema,"storageinfo");