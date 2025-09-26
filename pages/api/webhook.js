import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";

// still use raw body to allow Xendit signature verification later
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

    // we set external_id = payment._id when creating invoice
    // so we try to update by _id first
    if (status === "PAID" || status === "SETTLED") {
      const updated = await Payment.findByIdAndUpdate(
        externalId,
        { status: "LUNAS" },
        { new: true }
      );

      if (updated) {
        console.log("✅ Payment updated to LUNAS:", updated._id);
      } else {
        // fallback: maybe external_id was checkoutId
        const fallback = await Payment.findOneAndUpdate(
          { checkoutId: externalId },
          { status: "LUNAS" },
          { new: true }
        );
        if (fallback) {
          console.log("✅ Payment updated via checkoutId fallback:", fallback._id);
        } else {
          console.warn("❓ Payment doc not found for external_id:", externalId);
        }
      }
    } else {
      console.log("ℹ️ Non-paid status received:", status);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook handling error" });
  }
}
