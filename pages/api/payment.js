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

      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "LUNAS",
      });

      const response = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64"),
        },
        body: JSON.stringify({
          external_id: payment._id.toString(), 
          amount,
          description: `Payment for checkout ${checkoutId}`,
          currency: "IDR",
        }),
      });

      const invoice = await response.json();
      console.log(">>> Xendit Response:", invoice);

      return res.status(200).json({ payment, invoice });
    } catch (err) {
      console.error("Payment error:", err);
      return res.status(500).json({ error: "Gagal membuat payment" });
    }
  }

  res.status(405).end();
}

