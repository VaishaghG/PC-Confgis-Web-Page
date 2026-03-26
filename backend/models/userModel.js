const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true },
  productType: { type: String, required: true },
  quantity: { type: Number, default: 1 }
}, { _id: false });

const cartBuildComponentsSchema = new mongoose.Schema({
  cpu: { type: String, default: '' },
  gpu: { type: String, default: '' },
  ram: { type: String, default: '' },
  storage: { type: String, default: '' },
  cabinet: { type: String, default: '' }
}, { _id: false });

const cartBuildSchema = new mongoose.Schema({
  buildId: { type: mongoose.Schema.Types.ObjectId, ref: 'PCBuild', required: true },
  name: { type: String, default: '' },
  components: {
    type: cartBuildComponentsSchema,
    default: () => ({ cpu: '', gpu: '', ram: '', storage: '', cabinet: '' })
  }
}, { timestamps: false });

const cartSchema = new mongoose.Schema({
  individualItems: { type: [cartItemSchema], default: [] },
  builds: { type: [cartBuildSchema], default: [] }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for Google users
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
  googleId: { type: String },
  address: String,
  phoneno: String,
  phone: String,
  dob: String,
  cart: {
    type: cartSchema,
    default: () => ({ individualItems: [], builds: [] })
  }
});

module.exports = mongoose.model("User", userSchema, "Users");
