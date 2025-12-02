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

const core = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

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
        return res.status(400).json({
          success: false,
          message: "checkoutId, amount, phoneNumber wajib diisi.",
        });
      }

      // simpan nomor HP
      await Checkout.findByIdAndUpdate(checkoutId, { phone: phoneNumber });

      // buat payment PENDING
      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "PENDING",
        phone: phoneNumber,
      });

      // kirim WA
      try {
        await sendWhatsAppViaFonnte(
          phoneNumber,
          `Pesanan diterima. Total: Rp ${Number(amount).toLocaleString()}`
        );
      } catch (err) {
        console.warn("WA error:", err);
      }

      // ============= QRIS CORE API =============
      const orderId = "ORDER-" + Date.now();

      const parameter = {
        payment_type: "qris",
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: {
          first_name: phoneNumber,
          phone: phoneNumber,
        },
      };

      const midtransResponse = await core.charge(parameter);
      console.log("MIDTRANS CORE RESPONSE:", midtransResponse);

      // simpan transaction ID
      await Payment.findByIdAndUpdate(payment._id, {
        midtransTransactionId: midtransResponse.transaction_id,
      });

      // extract QR URL
      const qrUrl =
        midtransResponse?.actions?.find((a) => a.name === "generate-qr-code")
          ?.url || midtransResponse.qr_url || null;

      if (!qrUrl) {
        return res.status(500).json({
          success: false,
          message: "QR URL tidak ditemukan dalam response midtrans",
          midtransResponse,
        });
      }

      console.log("QR URL:", qrUrl);

      // KIRIM QR KE FRONTEND
      return res.status(200).json({
        success: true,
        orderId,
        qr_url: qrUrl,
        midtrans: midtransResponse,
      });
    } catch (err) {
      console.error("ERROR MIDTRANS:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal membuat payment",
        error: err,
      });
    }
  }

  return res.status(405).end();
}