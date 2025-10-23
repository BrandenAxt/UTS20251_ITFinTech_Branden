// models/Admin.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  code: String,
  expiresAt: Date,
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // hashed
  email: { type: String },
  phone: { type: String, index: true, sparse: true },
  otp: OtpSchema,
}, { timestamps: true });

export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
