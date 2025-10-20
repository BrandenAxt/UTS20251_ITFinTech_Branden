// pages/api/admin/stats-from-payments.js
import dbConnect from "../../../../lib/db";
import Payment from "../../../../models/Payment";
import { requireAdmin } from "../../../../lib/adminAuth";
import mongoose from "mongoose";

export default requireAdmin(async function handler(req, res) {
  await dbConnect();
  const { period = "daily", days = 30 } = req.query;

  if (period === "daily") {
    const n = Number(days || 30);
    const since = new Date(); since.setDate(since.getDate() - n);
    const sample = await Payment.findOne().lean();
    if (sample && sample.createdAt) {
      const agg = await Payment.aggregate([
        { $match: { status: "LUNAS", createdAt: { $gte: since } } },
        { $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
            total: { $sum: "$amount" }, count: { $sum: 1 }
        }},
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ]);
      const result = agg.map(a => {
        const { year, month, day } = a._id;
        const date = new Date(year, month - 1, day).toISOString().slice(0,10);
        return { date, total: a.total, count: a.count };
      });
      return res.json(result);
    } else {
      const payments = await Payment.find({ status: "LUNAS" }).lean();
      const buckets = {};
      const start = since.getTime();
      for (const p of payments) {
        let ts = null;
        try { ts = new mongoose.Types.ObjectId(p._id).getTimestamp().getTime(); } catch(e){ continue; }
        if (ts < start) continue;
        const date = new Date(ts).toISOString().slice(0,10);
        buckets[date] = buckets[date] || { total: 0, count: 0 };
        buckets[date].total += (p.amount || 0);
        buckets[date].count += 1;
      }
      const out = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0,10);
        out.push({ date: key, total: (buckets[key]?.total||0), count: (buckets[key]?.count||0) });
      }
      return res.json(out);
    }
  }

  res.status(400).json({ error: "invalid period" });
});
