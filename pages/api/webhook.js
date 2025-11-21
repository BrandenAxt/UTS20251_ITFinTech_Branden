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

export const config = { api: { bodyParser: false } }; // tetap pakai raw body

// Normalisasi nomor HP (sama persis kayak versi Xendit)
function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/[\s\-\(\)]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("0")) return "+62" + s.slice(1);
  if (/^62\d+/.test(s)) return "+" + s;
  if (/^[8]\d+/.test(s) && s.length >= 8) return "+62" + s;
  if (/^[1-9]\d+/.test(s) && s.length >= 8) return "+" + s;
  return "+" + s;
}

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

const core = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();

    // 🔹 Baca raw body (karena bodyParser false)
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const rawBody = Buffer.concat(chunks).toString("utf8");

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Midtrans webhook invalid JSON:", rawBody);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    // 🔹 Pakai helper Midtrans buat dapetin status lengkap
    const statusResponse = await core.transaction.notification(payload);

    console.log("MIDTRANS WEBHOOK:", statusResponse);

    const transactionId = statusResponse.transaction_id;
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    // 🔹 Map status Midtrans ke status internal
    let isPaid = false;

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") isPaid = true;
    } else if (transactionStatus === "settlement") {
      isPaid = true;
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      isPaid = false;
    } else if (transactionStatus === "pending") {
      // pending, biarin
    }

    if (!isPaid) {
      console.log("ℹ️ Midtrans status not paid yet:", transactionStatus);
      return res.status(200).json({ received: true });
    }

    // 🔹 Cari payment berdasarkan midtransTransactionId (yang diset di /api/payment)
    const payment = await Payment.findOneAndUpdate(
      { midtransTransactionId: transactionId },
      { status: "LUNAS" },
      { new: true }
    );

    if (!payment) {
      console.warn(
        "Payment not found for transaction_id:",
        transactionId,
        "order_id:",
        orderId
      );
      return res.status(200).json({ received: true });
    }

    console.log("✅ Payment updated to LUNAS:", payment._id);

    // 🔹 Ambil checkout detail
    const checkout = await Checkout.findById(
      payment.checkoutId || orderId
    ).lean();

    if (!checkout) {
      console.warn("Checkout not found for:", payment.checkoutId || orderId);
      return res.status(200).json({ received: true });
    }

    const phone = normalizePhone(checkout.phone || payment.phone);
    if (!phone) {
      console.warn("No phone number found, skip WA notification");
      return res.status(200).json({ received: true });
    }

    // 🔹 Format pesan WA (gue biarin sama konsepnya)
    let message = `✅ *Pembayaran Berhasil!*\n\nTerima kasih sudah berbelanja 🙌\n\n*Rincian Pesanan:*\n`;
    if (checkout.items && Array.isArray(checkout.items)) {
      checkout.items.forEach((it) => {
        const qty = it.qty || 1;
        message += `• ${it.name} x${qty} = Rp${Number(
          it.price * qty
        ).toLocaleString("id-ID")}\n`;
      });
    }
    const total = checkout.total || payment.amount || 0;
    message += `\n*Total:* Rp${Number(total).toLocaleString(
      "id-ID"
    )}\n\nPesanan Anda sedang diproses ✅`;

    // 🔹 Kirim via Fonnte (pakai function lu yang sama)
    try {
      const result = await sendWhatsAppViaFonnte(phone, message);
      if (result.ok) {
        console.log(`✅ Fonnte WA Invoice terkirim ke ${phone}`);
      } else {
        console.error(
          `❌ Fonnte WA gagal kirim ke ${phone}. Reason:`,
          result.reason
        );
      }
    } catch (e) {
      console.error("Error kirim WA via Fonnte:", e);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Midtrans Webhook main error:", err);
    return res.status(200).json({ received: true }); // jangan bikin Midtrans retry terus
  }
}
