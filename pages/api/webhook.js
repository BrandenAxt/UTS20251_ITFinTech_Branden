// import dbConnect from "../../lib/db";
// import Payment from "../../models/Payment";
// import Checkout from "../../models/Checkout";
// import { sendWhatsAppViaFonnte } from "../../lib/fonnte"; // ✅ cuma pakai ini aja, formatCartItems dihapus

// export const config = { api: { bodyParser: false } };

// /**
//  * Normalizes phone number to +628... format.
//  */
// function normalizePhone(raw) {
//   if (!raw) return null;
//   let s = String(raw).trim();
//   s = s.replace(/[\s\-\(\)]/g, "");
//   if (s.startsWith("+")) return s;
//   if (s.startsWith("0")) return "+62" + s.slice(1);
//   if (/^62\d+/.test(s)) return "+" + s;
//   if (/^[8]\d+/.test(s) && s.length >= 8) return "+62" + s;
//   if (/^[1-9]\d+/.test(s) && s.length >= 8) return "+" + s;
//   return "+" + s;
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     await dbConnect();

//     // Baca raw body dari webhook
//     const chunks = [];
//     for await (const c of req) chunks.push(c);
//     const rawBody = Buffer.concat(chunks).toString("utf8");

//     // Verifikasi token dari Xendit (optional)
//     const token = req.headers["x-callback-token"];
//     if (process.env.XENDIT_CALLBACK_TOKEN) {
//       if (!token || token !== process.env.XENDIT_CALLBACK_TOKEN) {
//         console.warn("Invalid Xendit callback token");
//         return res.status(401).json({ error: "Invalid callback token" });
//       }
//     }

//     // Parse payload JSON
//     let payload;
//     try {
//       payload = JSON.parse(rawBody);
//     } catch (e) {
//       console.error("Webhook invalid JSON:", rawBody);
//       return res.status(400).json({ error: "Invalid JSON" });
//     }

//     // Ambil status & ID pembayaran
//     const status = payload?.status || payload?.data?.status;
//     const externalId = payload?.external_id || payload?.data?.external_id;

//     if (!externalId) {
//       console.warn("Webhook missing external_id");
//       return res.status(200).json({ received: true });
//     }

//     if (status === "PAID" || status === "SETTLED") {
//       console.log("🔔 Payment success for:", externalId);

//       // Update payment jadi LUNAS
//       const payment = await Payment.findOneAndUpdate(
//         { $or: [{ _id: externalId }, { checkoutId: externalId }] },
//         { status: "LUNAS" },
//         { new: true }
//       );

//       if (!payment) {
//         console.warn("Payment not found:", externalId);
//         return res.status(200).json({ received: true });
//       }

//       console.log("✅ Payment updated to LUNAS:", payment._id);

//       // Ambil checkout detail
//       const checkout = await Checkout.findById(
//         payment.checkoutId || externalId
//       ).lean();

//       if (!checkout) {
//         console.warn("Checkout not found for:", payment.checkoutId);
//         return res.status(200).json({ received: true });
//       }

//       const phone = normalizePhone(checkout.phone || payment.phone);
//       if (!phone) {
//         console.warn("No phone number found, skip WA notification");
//         return res.status(200).json({ received: true });
//       }

//       // Buat pesan singkat invoice
//       let message = `✅ *Pembayaran Berhasil!*\n\nTerima kasih sudah berbelanja 🙌\n\n*Rincian Pesanan:*\n`;
//       if (checkout.items && Array.isArray(checkout.items)) {
//         checkout.items.forEach((it) => {
//           message += `• ${it.name} x${it.qty || 1} = Rp${(
//             it.price * (it.qty || 1)
//           ).toLocaleString("id-ID")}\n`;
//         });
//       }
//       const total = checkout.total || payment.amount || 0;
//       message += `\n*Total:* Rp${Number(total).toLocaleString("id-ID")}\n\nPesanan Anda sedang diproses ✅`;

//       // Kirim via Fonnte
//       const result = await sendWhatsAppViaFonnte(phone, message);
//       if (result.ok) {
//         console.log(`✅ Fonnte WA Invoice terkirim ke ${phone}`);
//       } else {
//         console.error(
//           `❌ Fonnte WA gagal kirim ke ${phone}. Reason:`,
//           result.reason
//         );
//       }

//       return res.status(200).json({ received: true });
//     }

//     console.log("ℹ️ Non-paid status:", status);
//     return res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("Webhook main error:", err);
//     // Jangan balas error ke Xendit, supaya ga retry terus
//     return res.status(200).json({ received: true });
//   }
// }


// pages/api/midtrans-webhook.js
import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";
import Checkout from "../../models/Checkout";
import { sendWhatsAppViaFonnte } from "../../lib/fonnte";
import midtransClient from "midtrans-client";

export const config = { api: { bodyParser: false } };

function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[\s\-\(\)]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("0")) return "+62" + s.slice(1);
  if (/^62/.test(s)) return "+" + s;
  if (/^[8]\d+/.test(s)) return "+62" + s;
  return "+" + s;
}

const core = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // baca raw body
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");

    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      console.error("Invalid JSON:", raw);
      return res.status(400).json({ message: "Invalid JSON" });
    }

    // ambil data lengkap status dari Midtrans
    const status = await core.transaction.notification(payload);

    console.log("MIDTRANS WEBHOOK:", status);

    const transactionId = status.transaction_id;
    const orderId = status.order_id;  // ORDER-xxxx
    const transactionStatus = status.transaction_status;
    const fraudStatus = status.fraud_status;

    // tentukan paid
    let isPaid =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    if (!isPaid) {
      return res.status(200).json({ received: true });
    }

    // Cari payment pakai midtransOrderId
    const payment = await Payment.findOneAndUpdate(
      { midtransOrderId: orderId },
      { status: "LUNAS", midtransTransactionId: transactionId },
      { new: true }
    );

    if (!payment) {
      console.warn("Payment tidak ditemukan untuk:", orderId);
      return res.status(200).json({ received: true });
    }

    console.log("Payment updated to LUNAS:", payment._id);

    // Ambil checkout
    const checkout = await Checkout.findById(payment.checkoutId).lean();
    if (!checkout) return res.status(200).json({ received: true });

    const phone = normalizePhone(checkout.phone || payment.phone);
    if (!phone) return res.status(200).json({ received: true });

    // kirim WA invoice
    try {
      let msg = `✅ *Pembayaran Berhasil!*\n\n`;
      msg += `Total: Rp${Number(payment.amount).toLocaleString("id-ID")}\n`;
      msg += `Pesanan Anda sedang diproses ☕`;

      await sendWhatsAppViaFonnte(phone, msg);
      console.log("Invoice WA sent to", phone);
    } catch (e) {
      console.error("Gagal kirim invoice WA:", e);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(200).json({ received: true });
  }
}

