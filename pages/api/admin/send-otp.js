import dbConnect from "../../../lib/db";
import Admin from "../../../models/Admin";
import { sendWhatsApp } from "../../../lib/wa";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone required" });

  const admin = await Admin.findOne({ phone });
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  admin.otp = { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) };
  await admin.save();

  await sendWhatsApp(phone, `Your admin login code: ${code} (valid 5 minutes)`);
  return res.status(200).json({ ok: true, phone });
}
