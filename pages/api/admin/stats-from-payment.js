// pages/api/admin/stats-from-payments.js
import dbConnect from "../../../lib/db";
import Payment from "../../../models/Payment";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const period = req.query.period || "daily";
    const days = Number(req.query.days ?? 30);
    const safeDays = Number.isFinite(days) && days > 0 ? days : 30;

    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    // Pipeline: pastikan createdAt ada (fallback ke ObjectId timestamp),
    // lalu group per tanggal (YYYY-MM-DD) dan sum amount untuk status LUNAS.
    const pipeline = [
      {
        // jika createdAt kosong, gunakan timestamp dari _id
        $addFields: {
          createdAt: {
            $ifNull: ["$createdAt", { $toDate: "$_id" }],
          },
        },
      },
      { $match: { createdAt: { $gte: since }, status: "LUNAS" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await Payment.aggregate(pipeline);

    const result = data.map((d) => ({
      date: d._id,
      total: Number(d.total) || 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Stats API error:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}
