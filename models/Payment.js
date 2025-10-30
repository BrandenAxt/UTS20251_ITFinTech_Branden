import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  checkoutId: String, 
  amount: Number,
  status: { type: String, default: "PENDING" }, 
  phone: String, // ✅ tambahkan ini untuk simpan nomor WA user
  xenditPaymentId: String, // ✅ optional tapi bagus ada (ID invoice Xendit)
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
