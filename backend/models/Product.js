const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, required: true }, // cpu, gpu, ram, storage, cabinet
  imgpath: String,
  rating: Number,
  // Additional fields for specific types can be added or kept flexible
}, { strict: false });

module.exports = mongoose.model("Product", productSchema, "products");
