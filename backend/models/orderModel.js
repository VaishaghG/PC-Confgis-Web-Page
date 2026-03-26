const mongoose = require("mongoose");

/* ── Cabinet sub-schema (stores name + image path) ── */
const cabinetSchema = new mongoose.Schema({
  name:  { type: String, default: "" },
  image: { type: String, default: "" }   // e.g. "images/corsair4000d.png"
}, { _id: false });

/* ── Individual cart item (non-build product OR build snapshot) ── */
const orderItemSchema = new mongoose.Schema({
  productId:   { type: String },
  productType: { type: String },   // "cpu" | "gpu" | "ram" | "storage" | "cabinet" | "build"
  type:        { type: String, default: "item" }, // "item" or "build"
  name:        { type: String },
  price:       { type: Number, default: 0 },
  quantity:    { type: Number, default: 1 },
  image:       { type: String, default: "" },

  // Snapshot fields for builds
  cpu:     { type: String, default: "" },
  gpu:     { type: String, default: "" },
  ram:     { type: String, default: "" },
  storage: { type: String, default: "" },
  cabinet: { type: cabinetSchema, default: () => ({}) }
}, { _id: false });

/* ── PC Build sub-schema ── */
const orderBuildSchema = new mongoose.Schema({
  name:    { type: String, default: "Custom PC Build" },
  cpu:     { type: String, default: "" },
  gpu:     { type: String, default: "" },
  ram:     { type: String, default: "" },
  storage: { type: String, default: "" },
  cabinet: { type: cabinetSchema, default: () => ({}) },
  price:   { type: Number, default: 0 }
}, { _id: false });

/* ── Order (top-level) ── */
const orderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items:       { type: [orderItemSchema], default: [] },
  builds:      { type: [orderBuildSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  status:      { type: String, default: "paid" },
  deliveryAddress: { type: String, default: "" },
  orderId:     { type: String }   // PCO-XXXXXXXX displayed to customer
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema, "orders");