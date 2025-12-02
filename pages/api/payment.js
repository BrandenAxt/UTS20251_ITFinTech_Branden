// import dbConnect from "../../lib/db";
// import Payment from "../../models/Payment";
// import Checkout from "../../models/Checkout";
// import { sendWhatsAppViaFonnte } from "../../lib/fonnte"; // ✅ WA function kamu

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "GET") {
//     const payments = await Payment.find({});
//     return res.status(200).json(payments);
//   }

//   if (req.method === "POST") {
//     try {
//       const { checkoutId, amount, phoneNumber } = req.body; 

//       if (!checkoutId || !amount || !phoneNumber) {
//         return res.status(400).json({ error: "Data tidak lengkap: checkoutId, amount, phoneNumber wajib." });
//       }

//       // ✅ Save nomor HP di checkout doc
//       await Checkout.findByIdAndUpdate(checkoutId, { phone: phoneNumber });

//       // ✅ Create payment (pending)
//       const payment = await Payment.create({
//         checkoutId,
//         amount,
//         status: "PENDING",
//         phone: phoneNumber,
//       });

//       // ✅ Kirim pesan WA pendek (AMAN versi Fonnte free)
//       try {
//         const msg = `Pesanan diterima ✅
// Total: Rp ${Number(amount).toLocaleString()}`;
//         const waRes = await sendWhatsAppViaFonnte(phoneNumber, msg);

//         if (!waRes.ok) {
//           console.warn("Fonnte pre-payment WA send failed:", waRes);
//         } else {
//           console.log("Fonnte pre-payment WA sent.");
//         }
//       } catch (err) {
//         console.error("Error kirim WA pre-payment:", err);
//       }

//       // ✅ Create Xendit invoice
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
//           customer: { mobile_number: phoneNumber }
//         }),
//       });

//       const invoice = await response.json();
//       console.log(">>> Xendit Response:", invoice);

//       if (response.status !== 200 || !invoice.invoice_url) {
//         console.error("Xendit Invoice Creation Failed:", invoice);
//         return res.status(500).json({ error: invoice.message || "Gagal buat invoice Xendit." });
//       }

//       await Payment.findByIdAndUpdate(payment._id, { xenditPaymentId: invoice.id });
      
//       return res.status(200).json({ payment, invoice });
//     } catch (err) {
//       console.error("Payment error:", err);
//       return res.status(500).json({ error: "Gagal membuat payment" });
//     }
//   }

//   res.status(405).end();
// }

// pages/api/payment.js
import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";
import Checkout from "../../models/Checkout";
import { sendWhatsAppViaFonnte } from "../../lib/fonnte";
import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// CoreApi tetap ada (biarin, ga dipake)
const core = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export default async function handler(req, res) {
  await dbConnect();

  // ==========================
  // GET LIST PAYMENT (TIDAK DIUBAH)
  // ==========================
  if (req.method === "GET") {
    const payments = await Payment.find({});
    return res.status(200).json(payments);
  }

  // ==========================
  // POST: CREATE PAYMENT + SNAP QRIS
  // ==========================
  if (req.method === "POST") {
    try {
      const { checkoutId, amount, phoneNumber } = req.body;

      if (!checkoutId || !amount || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Data tidak lengkap: checkoutId, amount, phoneNumber wajib.",
        });
      }

      // === Simpan nomor HP di checkout ===
      await Checkout.findByIdAndUpdate(checkoutId, { phone: phoneNumber });

      // === Simpan payment pending ===
      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "PENDING",
        phone: phoneNumber,
      });

      // === Kirim WA pre-payment ===
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

      // ================================
      // 🔥 MIDTRANS SNAP QRIS DI SINI 🔥
      // ================================
      const orderId = "ORDER-" + Date.now();

      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const auth = "Basic " + Buffer.from(serverKey + ":").toString("base64");

      const snapRes = await fetch(
        isProduction
          ? "https://app.midtrans.com/snap/v1/transactions"
          : "https://app.sandbox.midtrans.com/snap/v1/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: orderId,
              gross_amount: amount,
            },
            enabled_payments: ["qris"],
            customer_details: {
              first_name: phoneNumber || "Customer",
              phone: phoneNumber,
            },
          }),
        }
      );

      const snap = await snapRes.json();
      console.log(">>> SNAP response:", snap);

      if (!snap?.redirect_url) {
        console.error("SNAP ERROR:", snap);
        return res.status(500).json({
          success: false,
          message: "Gagal membuat SNAP QRIS",
        });
      }

      // Simpan orderId ke payment (opsional tapi bagus)
      await Payment.findByIdAndUpdate(payment._id, { orderId });

      // Kirim URL SNAP ke frontend
      return res.status(200).json({
        success: true,
        payment,
        orderId,
        snap_redirect_url: snap.redirect_url,
      });

    } catch (err) {
      console.error("Payment error (Midtrans):", err);
      return res.status(500).json({
        success: false,
        message: "Gagal membuat payment",
      });
    }
  }

  // METHOD NOT ALLOWED
  res.status(405).end();
}

