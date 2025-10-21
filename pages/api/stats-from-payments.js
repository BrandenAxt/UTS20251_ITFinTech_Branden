// pages/api/stats-from-payments.js
// lightweight public test route so frontend has a fallback
export default function handler(req, res) {
  // echo query so frontend can see period/days
  const { period = "daily", days = "30" } = req.query;
  res.status(200).json({ ok: true, route: "public stats-from-payments", period, days });
}
