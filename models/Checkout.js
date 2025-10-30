// models/Checkout.js
import mongoose from "mongoose";

const CheckoutSchema = new mongoose.Schema({
  items: Array, // simpan item produk yang dibeli
  total: Number,
  status: { type: String, default: "PENDING" }, // PENDING / LUNAS
  phone: { type: String },        // E.164 formatted phone (like +62812...)
  checkoutId: { type: String },   // short external id (optional)
}, { timestamps: true });

export default mongoose.models.Checkout || mongoose.model("Checkout", CheckoutSchema);
