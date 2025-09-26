import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";

export const config = {
  api: {
    bodyParser: false, // supaya raw body bisa dipakai (Xendit kirim JSON)
  },
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      // Parse raw body
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawBody = Buffer.concat(buffers).toString("utf8");

      let event;
      try {
        event = JSON.parse(rawBody);
      } catch (err) {
        console.error("Invalid JSON:", rawBody);
        return res.status(400).send("Invalid JSON");
      }

      console.log("Webhook event:", event);

      // Cek event dari Xendit
      if (event.status === "PAID" || event.status === "SETTLED") {
        // Update status payment di DB
        await Payment.findOneAndUpdate(
          { checkoutId: event.external_id }, // external_id = checkoutId (atau _id payment)
          { status: "LUNAS" },
          { new: true }
        );
        console.log("Payment updated to LUNAS:", event.external_id);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ error: "Webhook handling error" });
    }
  }

  res.status(405).end();
}
