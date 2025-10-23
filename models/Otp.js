// models/Otp.js
import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true }, // NOTE: production -> store hash
  role: { type: String, default: "user" }, // optional: admin/user
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true,
});

// TTL index: MongoDB will auto-delete expired OTP docs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
