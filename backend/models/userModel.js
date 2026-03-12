const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  address: String,
  phoneno: String
});

module.exports = mongoose.model("User", userSchema,"Users");