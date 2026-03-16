const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for Google users
  googleId: { type: String },
  address: String,
  phoneno: String,
  phone: String,
  dob: String,
  cart: {
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productType: String,
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 }
    }],
    builds: [{
      buildId: { type: mongoose.Schema.Types.ObjectId, ref: 'PCBuild' },
      name: String,
      price: Number,
      components: Object // { cpu, gpu, ram, storage, cabinet }
    }],
    activeBuild: {
      cpu: String,
      gpu: String,
      ram: String,
      storage: String,
      cabinet: String
    }
  }
});

module.exports = mongoose.model("User", userSchema, "Users");
