import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  checkoutId: String,
  amount: Number,
  status: { type: String, default: "PENDING" },

  phone: String,

  midtransTransactionId: String,   // Penting
  midtransSnapToken: String,
  midtransSnapUrl: String,

  xenditPaymentId: String,         
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
