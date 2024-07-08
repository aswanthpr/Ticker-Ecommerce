const mongoose = require("mongoose");
const userSchema = require("../models/userModel");

const regOtp = new mongoose.Schema({


   email: {
      type: String,
      required: true,
      unique: true
   },
   otp: {
      type: String,
      required: true,

   },
   

}, { timestamps: true });

regOtp.index({ createdAt: 1 }, { expireAfterSeconds: 100 });

module.exports = mongoose.model("regOtp", regOtp);
