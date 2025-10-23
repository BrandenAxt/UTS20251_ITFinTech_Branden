import dbConnect from "../../../lib/db";
import Admin from "../../../models/Admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "change_me";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: "phone & code required" });

  const admin = await Admin.findOne({ phone });
  if (!admin || !admin.otp) return res.status(401).json({ error: "Invalid code" });

  if (admin.otp.code !== code) return res.status(401).json({ error: "Invalid code" });
  if (new Date() > new Date(admin.otp.expiresAt)) return res.status(401).json({ error: "Code expired" });

  admin.otp = undefined;
  await admin.save();

  const token = jwt.sign({ adminId: admin._id, username: admin.username }, SECRET, { expiresIn: "8h" });
  return res.status(200).json({ ok: true, token });
  console.log("DEBUG TWILIO_VERIFY_SID:", verifySid, "prefix:", String(verifySid).slice(0,2));

}
