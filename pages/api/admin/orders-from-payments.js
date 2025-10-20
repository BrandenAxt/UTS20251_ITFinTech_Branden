// pages/api/admin/orders-from-payments.js
import dbConnect from "../../../../lib/db";
import Payment from "../../../../models/Payment";
import { requireAdmin } from "../../../../lib/adminAuth";
import mongoose from "mongoose";

async function handler(req, res) {
  await dbConnect();
  const { status, page = 1, limit = 50 } = req.query;
  const q = {};
  if (status) q.status = status;
  const payments = await Payment.find(q)
    .sort({ _id: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const mapped = payments.map(p => {
    if (!p.createdAt) {
      try { p.createdAt = new mongoose.Types.ObjectId(p._id).getTimestamp(); } catch(e){ p.createdAt = null; }
    }
    return p;
  });

  return res.status(200).json(mapped);
}

export default requireAdmin(handler);
