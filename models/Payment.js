import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  checkoutId: String, // relasi ke Checkout
  amount: Number,
  status: { type: String, default: "PENDING" }, // PENDING / LUNAS
});

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
