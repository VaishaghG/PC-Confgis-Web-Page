const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for Google users
  googleId: { type: String },
  addresses: {
    home: { type: String, default: "" },
    office: { type: String, default: "" }
  },
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
      cabinet: {
        id: { type: String, default: '' },
        name: { type: String, default: '' },
        image: { type: String, default: '' }
      }
    }
  }
});

module.exports = mongoose.model("User", userSchema, "Users");
