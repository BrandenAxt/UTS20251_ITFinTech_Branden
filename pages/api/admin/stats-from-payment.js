import dbConnect from "../../../lib/db";
import Payment from "../../../models/Payment";
import { requireAdmin } from "../../../lib/adminAuth";

async function handler(req, res) {
  try {
    await dbConnect();

    const { period = "daily", days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const data = await Payment.aggregate([
      { $match: { createdAt: { $gte: since }, status: "LUNAS" } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = data.map((d) => ({
      date: d._id,
      total: d.total,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error in /api/admin/stats-from-payments:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}

export default requireAdmin(handler);
