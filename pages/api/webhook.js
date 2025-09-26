import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();

    // raw body
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // (opsional) verifikasi token dari Xendit jika ada
    const token = req.headers["x-callback-token"];
    if (process.env.XENDIT_CALLBACK_TOKEN) {
      if (!token || token !== process.env.XENDIT_CALLBACK_TOKEN) {
        console.warn("Invalid Xendit callback token");
        return res.status(401).json({ error: "Invalid callback token" });
      }
    }

    // parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Webhook invalid JSON:", rawBody);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const status = payload?.status || payload?.data?.status;
    const externalId = payload?.external_id || payload?.data?.external_id;

    if (!externalId) {
      console.warn("Webhook missing external_id");
      return res.status(200).json({ received: true });
    }

    if (status === "PAID" || status === "SETTLED") {
      // cover 2 kemungkinan: external_id == _id (rekomendasi) atau == checkoutId
      const updated = await Payment.findOneAndUpdate(
        { $or: [{ _id: externalId }, { checkoutId: externalId }] },
        { status: "LUNAS" },
        { new: true }
      );
      if (updated) {
        console.log("✅ Payment updated to LUNAS:", updated._id);
      } else {
        console.warn("❌ Payment not found for external_id:", externalId);
      }
    } else {
      console.log("ℹ️ Non-paid status:", status);
    }

    // selalu 200 supaya Xendit ga retry spam
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({ received: true }); // tetap 200
  }
}
