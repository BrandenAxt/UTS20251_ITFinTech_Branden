// models/User.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  code: String,
  expiresAt: Date,
});

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, index: true, sparse: true },
  phone: { type: String, index: true, sparse: true }, // E.164 e.g. +62812...
  passwordHash: { type: String },
  isPhoneVerified: { type: Boolean, default: false },
  otp: OtpSchema,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
