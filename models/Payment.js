import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  checkoutId: String,
  amount: Number,
  status: { type: String, default: "PENDING" },

  phone: String,

  // Midtrans fields
  midtransOrderId: String,          // ORDER-xxxx
  midtransTransactionId: String,    // UUID (from webhook)

  midtransSnapToken: String,
  midtransSnapUrl: String,

}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
