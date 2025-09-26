import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";

// tetap pakai raw body (kalau nanti mau verifikasi signature Xendit)
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();

    // collect raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // safe JSON parse
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Webhook invalid JSON:", rawBody);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    console.log("🟣 Xendit Webhook payload:", payload);

    // read status & external_id from top-level or nested data
    const status = payload?.status || payload?.data?.status;
    const externalId = payload?.external_id || payload?.data?.external_id;

    if (!externalId) {
      console.warn("⚠️ external_id not found in payload");
      return res.status(200).json({ received: true, note: "external_id missing" });
    }

    if (status === "PAID" || status === "SETTLED") {
      console.log("➡️  Will update by external_id:", externalId, "with status:", status);

      // SATU QUERY yang cover 2 kemungkinan: _id = externalId ATAU checkoutId = externalId
      const updated = await Payment.findOneAndUpdate(
        { $or: [{ _id: externalId }, { checkoutId: externalId }] },
        { status: "LUNAS" },
        { new: true }
      );

      if (updated) {
        console.log("✅ Payment updated to LUNAS:", updated._id);
      } else {
        console.warn("❌ No Payment matched for external_id:", externalId);
      }
    } else {
      console.log("ℹ️ Webhook non-paid status:", status);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook handling error" });
  }
}
