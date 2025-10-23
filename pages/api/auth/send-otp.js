// pages/api/auth/send-otp.js
import dbConnect from "../../../lib/db";
import Otp from "../../../models/Otp";
import twilio from "twilio"; // or keep Fazpass logic if you prefer
// Jika pake Twilio messages fallback:
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function normalizePhone(p) {
  if (!p) return "";
  let s = String(p).trim().replace(/[\s\-\(\)]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { phone, role } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone is required" });

  const destination = normalizePhone(phone);
  if (!destination) return res.status(400).json({ error: "invalid phone format" });

  // generate OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  try {
    await dbConnect();

    // save to DB (production: store hash of otp)
    await Otp.create({ phone: destination, code: otp, role: role || "user", expiresAt });

    // try send via Twilio WhatsApp (or fallback to SMS)
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM, // "whatsapp:+1415..."
        to: `whatsapp:+${destination}`,
        body: `Kode verifikasi: ${otp}. Berlaku 2 menit.`,
      });
      return res.status(200).json({ ok: true, message: "OTP dikirim via WhatsApp (Twilio)", test: false });
    } catch (twErr) {
      console.warn("Twilio send failed, falling back to returning OTP for dev:", twErr.message || twErr);
      // Fallback (dev only): return OTP in response so UI can proceed during testing
      return res.status(200).json({ ok: true, test: true, otp, message: "vendor_fallback" });
    }
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}
