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
import util from "util";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Init Snap (NOT Core)
const snap = new midtransClient.Snap({
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

      // update phone di checkout
      try {
        await Checkout.findByIdAndUpdate(checkoutId, { phone: phoneNumber });
      } catch (e) {
        console.warn("Warning: update checkout phone gagal:", e);
      }

      // create payment pending
      const payment = await Payment.create({
        checkoutId,
        amount,
        status: "PENDING",
        phone: phoneNumber,
      });

      // pre-payment WA (non-blocking)
      (async () => {
        try {
          await sendWhatsAppViaFonnte(
            phoneNumber,
            `Pesanan diterima ✅\nTotal: Rp ${Number(amount).toLocaleString()}`
          );
          console.log("Fonnte pre-payment WA sent.");
        } catch (err) {
          console.warn("Fonnte pre-payment WA failed:", err);
        }
      })();

      // Build snap transaction parameter
      const orderId = "ORDER-" + Date.now();

      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        item_details: [
          {
            id: checkoutId,
            price: amount,
            quantity: 1,
            name: `Order ${checkoutId}`,
          },
        ],
        customer_details: {
          first_name: phoneNumber || "Customer",
          phone: phoneNumber,
        },
        // Optional: you can restrict enabled payments
        // enabled_payments: ["qris"], // uncomment jika mau paksa QRIS
        callbacks: {
          // Snap may ignore callbacks property; notification URL set in Dashboard is preferred
        },
      };

      // call snap.createTransaction()
      const snapResponse = await snap.createTransaction(parameter);
      // snapResponse usually contains: token and redirect_url
      console.log("SNAP createTransaction response:", util.inspect(snapResponse, { depth: 4 }));

      // save some snap info in payment doc
      await Payment.findByIdAndUpdate(payment._id, {
        midtransSnapToken: snapResponse.token || null,
        midtransSnapUrl: snapResponse.redirect_url || null,
      });

      // return snap redirect url to frontend
      return res.status(200).json({
        success: true,
        payment,
        orderId,
        snap_redirect_url: snapResponse.redirect_url,
        snap_token: snapResponse.token,
        raw: snapResponse,
      });
    } catch (err) {
      console.error("ERROR MIDTRANS SNAP:", err);
      // build safe error payload
      const safe = {
        message: err?.message || String(err),
        httpStatusCode: err?.httpStatusCode || null,
        apiResponse: err?.ApiResponse || err?.apiResponse || null,
        inspect: util.inspect(err, { depth: 4 }),
      };
      console.error("SAFE ERROR PROPS:", safe);
      return res.status(500).json({
        success: false,
        message: safe.message || "Gagal membuat payment",
        detail: safe.apiResponse || safe.inspect,
      });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
