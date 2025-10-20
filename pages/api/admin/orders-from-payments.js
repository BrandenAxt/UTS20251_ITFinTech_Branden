// pages/api/admin/orders-from-payments.js
import dbConnect from "../../../lib/db";
import Payment from "../../../models/Payment";
import mongoose from "mongoose";

// optional: requireAdmin wrapper may exist in your project.
// If you have lib/adminAuth.js that exports requireAdmin, change the import accordingly.
// For now we try to use it if available, otherwise we fallback to a no-op.
let requireAdmin = (handler) => handler;
try {
  // dynamic import attempt (works only on server)
  // if file doesn't exist, we silently skip
  // eslint-disable-next-line no-eval
  const auth = await import("../../../lib/adminAuth").catch(() => null);
  if (auth && auth.requireAdmin) requireAdmin = auth.requireAdmin;
} catch (e) {
  // ignore in case dynamic import not allowed
}

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
    const payments = await Payment.find(q)
      .sort({ _id: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const mapped = payments.map((p) => {
      if (!p.createdAt) {
        try {
          p.createdAt = new mongoose.Types.ObjectId(p._id).getTimestamp();
        } catch (e) {
          p.createdAt = null;
        }
      }
      return p;
    });

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("Query payments error:", err);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
}

export default requireAdmin(handler);
