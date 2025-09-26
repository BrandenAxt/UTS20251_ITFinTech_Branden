import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const payments = await Payment.find({});
    return res.status(200).json(payments);
  }

  if (req.method === "POST") {
    try {
      const { checkoutId, amount } = req.body;

      // 1. Simpan payment ke DB dengan status awal PENDING
      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "PENDING",
      });

      // 2. Request ke Xendit buat bikin invoice
      const response = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64"),
        },
        body: JSON.stringify({
          external_id: payment._id.toString(), // pakai _id payment sebagai identifier unik
          amount,
          description: `Payment for checkout ${checkoutId}`,
          currency: "IDR",
        }),
      });

      const invoice = await response.json();
      console.log(">>> Xendit Response:", invoice);
      // 3. Return ke frontend
      return res.status(200).json({ payment, invoice });
    } catch (err) {
      console.error("Payment error:", err);
      return res.status(500).json({ error: "Gagal membuat payment" });
    }
  }

  res.status(405).end();
}

