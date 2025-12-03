// pages/api/admin/orders-from-payments.js
import dbConnect from "../../../lib/db";
import Payment from "../../../models/Payment";
import Checkout from "../../../models/Checkout";
import mongoose from "mongoose";

let requireAdmin = (handler) => handler;
try {
  const auth = await import("../../../lib/adminAuth").catch(() => null);
  if (auth && auth.requireAdmin) requireAdmin = auth.requireAdmin;
} catch (e) {}

async function handler(req, res) {
  try {
    await dbConnect();
  } catch (err) {
    console.error("DB connect error:", err);
    return res.status(500).json({ error: "DB connection failed" });
  }

  const { status, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;

  try {
    // Ambil semua payment
    const payments = await Payment.find(q)
      .sort({ _id: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // 🔥 JOIN MANUAL DENGAN CHECKOUT
    const checkoutIds = payments.map((p) => p.checkoutId);
    const checkouts = await Checkout.find({
      _id: { $in: checkoutIds },
    }).lean();

    const checkoutMap = {};
    checkouts.forEach((c) => {
      checkoutMap[String(c._id)] = c;
    });

    // 🔥 Kombinasi data Payment + Checkout
    const result = payments.map((p) => {
      const checkout = checkoutMap[p.checkoutId] || {};

      // fallback createdAt
      if (!p.createdAt) {
        try {
          p.createdAt = new mongoose.Types.ObjectId(p._id).getTimestamp();
        } catch {
          p.createdAt = null;
        }
      }

      return {
        ...p,
        items: checkout.items || [],
        phone: checkout.phone || p.phone || null,
        total: checkout.total || p.amount,
        checkoutStatus: checkout.status || p.status, // buat jaga-jaga
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Query payments error:", err);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
}

export default requireAdmin(handler);
