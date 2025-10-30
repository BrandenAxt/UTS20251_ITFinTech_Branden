// // pages/api/webhook.js
// import dbConnect from "../../lib/db";
// import Payment from "../../models/Payment";
// import Checkout from "../../models/Checkout";
// // 1. IMPORT FONTTE HELPER
// import { sendWhatsAppViaFonnte } from "../../lib/fonnte"; 

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
//   if (/^[1-9]\d+/.test(s) && s.length >= 8) return "+" + s;
//   return "+" + s;
// }

// // FUNGSI SEND WHATSAPP TWILIO DIHAPUS (Digantikan oleh Fonnte)

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

//   try {
//     await dbConnect();

//     // Raw body parsing (untuk verifikasi Xendit)
//     const chunks = [];
//     for await (const c of req) chunks.push(c);
//     const rawBody = Buffer.concat(chunks).toString("utf8");

//     // optional verification token
//     const token = req.headers["x-callback-token"];
//     if (process.env.XENDIT_CALLBACK_TOKEN) {
//       if (!token || token !== process.env.XENDIT_CALLBACK_TOKEN) {
//         console.warn("Invalid Xendit callback token");
//         return res.status(401).json({ error: "Invalid callback token" });
//       }
//     }

//     // parse payload
//     let payload;
//     try {
//       payload = JSON.parse(rawBody);
//     } catch (e) {
//       console.error("Webhook invalid JSON:", rawBody);
//       return res.status(400).json({ error: "Invalid JSON" });
//     }

//     // Ambil Status dan External ID
//     const status = payload?.status || payload?.data?.status;
//     const externalId = payload?.external_id || payload?.data?.external_id;

//     if (!externalId) {
//       console.warn("Webhook missing external_id");
//       return res.status(200).json({ received: true });
//     }

//     if (status === "PAID" || status === "SETTLED") {
//       // 1. Update Payment status
//       const updated = await Payment.findOneAndUpdate(
//         { $or: [{ _id: externalId }, { checkoutId: externalId }] },
//         { status: "LUNAS" },
//         { new: true }
//       );

//       if (updated) {
//         console.log("✅ Payment updated to LUNAS:", updated._id);

//         // 2. Tentukan nomor telepon
//         let phone = updated.phone || null;
//         if (!phone && updated.checkoutId) {
//           try {
//             const co = await Checkout.findOne({ checkoutId: updated.checkoutId }).lean();
//             if (co && co.phone) phone = co.phone;
//           } catch (e) {
//             console.warn("Failed to lookup Checkout for phone:", e && e.message ? e.message : e);
//           }
//         }

//         // 3. Kirim notifikasi WA menggunakan Fonnte
//         const normalized = normalizePhone(phone);
//         if (normalized) {
//           const amount = updated.amount ?? updated.total ?? updated.value ?? updated.price ?? 0;
//           const msg = `Pembayaran diterima ✅\nInvoice: ${updated.checkoutId || String(updated._id)}\nJumlah: Rp ${Number(amount).toLocaleString()}\nTerima kasih!`;
          
//           const result = await sendWhatsAppViaFonnte(normalized, msg);
          
//           if (result.ok) {
//             console.log("✅ Fonnte WA notification sent successfully for payment:", updated._id);
//           } else {
//             console.error("❌ Fonnte WA notification FAILED for payment:", updated._id, result.reason, result.details);
//           }
          
//         } else {
//           console.warn("No valid phone number available to send WA for payment:", updated._id);
//         }
//       } else {
//         console.warn("❌ Payment not found for external_id:", externalId);
//       }
//     } else {
//       console.log("ℹ️ Non-paid status:", status);
//     }

//     return res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("Webhook error:", err && err.message ? err.message : err);
//     return res.status(200).json({ received: true });
//   }
// }

// pages/api/webhook.js
// pages/api/webhook.js
import dbConnect from "../../lib/db";
import Payment from "../../models/Payment";
import Checkout from "../../models/Checkout";
import { sendWhatsAppViaFonnte } from "../../lib/fonnte"; // ✅ cuma pakai ini aja, formatCartItems dihapus

export const config = { api: { bodyParser: false } };

/**
 * Normalizes phone number to +628... format.
 */
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

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();

    // Baca raw body dari webhook
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // Verifikasi token dari Xendit (optional)
    const token = req.headers["x-callback-token"];
    if (process.env.XENDIT_CALLBACK_TOKEN) {
      if (!token || token !== process.env.XENDIT_CALLBACK_TOKEN) {
        console.warn("Invalid Xendit callback token");
        return res.status(401).json({ error: "Invalid callback token" });
      }
    }

    // Parse payload JSON
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("Webhook invalid JSON:", rawBody);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    // Ambil status & ID pembayaran
    const status = payload?.status || payload?.data?.status;
    const externalId = payload?.external_id || payload?.data?.external_id;

    if (!externalId) {
      console.warn("Webhook missing external_id");
      return res.status(200).json({ received: true });
    }

    if (status === "PAID" || status === "SETTLED") {
      console.log("🔔 Payment success for:", externalId);

      // Update payment jadi LUNAS
      const payment = await Payment.findOneAndUpdate(
        { $or: [{ _id: externalId }, { checkoutId: externalId }] },
        { status: "LUNAS" },
        { new: true }
      );

      if (!payment) {
        console.warn("Payment not found:", externalId);
        return res.status(200).json({ received: true });
      }

      console.log("✅ Payment updated to LUNAS:", payment._id);

      // Ambil checkout detail
      const checkout = await Checkout.findById(
        payment.checkoutId || externalId
      ).lean();

      if (!checkout) {
        console.warn("Checkout not found for:", payment.checkoutId);
        return res.status(200).json({ received: true });
      }

      const phone = normalizePhone(checkout.phone || payment.phone);
      if (!phone) {
        console.warn("No phone number found, skip WA notification");
        return res.status(200).json({ received: true });
      }

      // Buat pesan singkat invoice
      let message = `✅ *Pembayaran Berhasil!*\n\nTerima kasih sudah berbelanja 🙌\n\n*Rincian Pesanan:*\n`;
      if (checkout.items && Array.isArray(checkout.items)) {
        checkout.items.forEach((it) => {
          message += `• ${it.name} x${it.qty || 1} = Rp${(
            it.price * (it.qty || 1)
          ).toLocaleString("id-ID")}\n`;
        });
      }
      const total = checkout.total || payment.amount || 0;
      message += `\n*Total:* Rp${Number(total).toLocaleString("id-ID")}\n\nPesanan Anda sedang diproses ✅`;

      // Kirim via Fonnte
      const result = await sendWhatsAppViaFonnte(phone, message);
      if (result.ok) {
        console.log(`✅ Fonnte WA Invoice terkirim ke ${phone}`);
      } else {
        console.error(
          `❌ Fonnte WA gagal kirim ke ${phone}. Reason:`,
          result.reason
        );
      }

      return res.status(200).json({ received: true });
    }

    console.log("ℹ️ Non-paid status:", status);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook main error:", err);
    // Jangan balas error ke Xendit, supaya ga retry terus
    return res.status(200).json({ received: true });
  }
}
