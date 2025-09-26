import mongoose from "mongoose";

const CheckoutSchema = new mongoose.Schema({
  items: Array, // simpan item produk yang dibeli
  total: Number,
  status: { type: String, default: "PENDING" }, // PENDING / LUNAS
});

export default mongoose.models.Checkout || mongoose.model("Checkout", CheckoutSchema);
