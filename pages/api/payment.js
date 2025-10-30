// import dbConnect from "../../lib/db";
// import Payment from "../../models/Payment";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "GET") {
//     const payments = await Payment.find({});
//     return res.status(200).json(payments);
//   }

//   if (req.method === "POST") {
//     try {
//       const { checkoutId, amount } = req.body;

//       const payment = await Payment.create({
//         checkoutId,
//         amount,
//         status: "LUNAS",
//       });

//       const response = await fetch("https://api.xendit.co/v2/invoices", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization:
//             "Basic " +
//             Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64"),
//         },
//         body: JSON.stringify({
//           external_id: payment._id.toString(), 
//           amount,
//           description: `Payment for checkout ${checkoutId}`,
//           currency: "IDR",
//         }),
//       });

//       const invoice = await response.json();
//       console.log(">>> Xendit Response:", invoice);

//       return res.status(200).json({ payment, invoice });
//     } catch (err) {
//       console.error("Payment error:", err);
//       return res.status(500).json({ error: "Gagal membuat payment" });
//     }
//   }

//   res.status(405).end();
// }

import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";
import Checkout from "../../models/Checkout";
import { sendWhatsAppViaFonnte } from "../../lib/fonnte"; // ✅ WA function kamu

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const payments = await Payment.find({});
    return res.status(200).json(payments);
  }

  if (req.method === "POST") {
    try {
      const { checkoutId, amount, phoneNumber } = req.body; 

      if (!checkoutId || !amount || !phoneNumber) {
        return res.status(400).json({ error: "Data tidak lengkap: checkoutId, amount, phoneNumber wajib." });
      }

      // ✅ Save nomor HP di checkout doc
      await Checkout.findByIdAndUpdate(checkoutId, { phone: phoneNumber });

      // ✅ Create payment (pending)
      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "PENDING",
        phone: phoneNumber,
      });

      // ✅ Kirim pesan WA pendek (AMAN versi Fonnte free)
      try {
        const msg = `Pesanan diterima ✅
Total: Rp ${Number(amount).toLocaleString()}`;
        const waRes = await sendWhatsAppViaFonnte(phoneNumber, msg);

        if (!waRes.ok) {
          console.warn("Fonnte pre-payment WA send failed:", waRes);
        } else {
          console.log("Fonnte pre-payment WA sent.");
        }
      } catch (err) {
        console.error("Error kirim WA pre-payment:", err);
      }

      // ✅ Create Xendit invoice
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
          customer: { mobile_number: phoneNumber }
        }),
      });

      const invoice = await response.json();
      console.log(">>> Xendit Response:", invoice);

      if (response.status !== 200 || !invoice.invoice_url) {
        console.error("Xendit Invoice Creation Failed:", invoice);
        return res.status(500).json({ error: invoice.message || "Gagal buat invoice Xendit." });
      }

      await Payment.findByIdAndUpdate(payment._id, { xenditPaymentId: invoice.id });
      
      return res.status(200).json({ payment, invoice });
    } catch (err) {
      console.error("Payment error:", err);
      return res.status(500).json({ error: "Gagal membuat payment" });
    }
  }

  res.status(405).end();
}
