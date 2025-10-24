import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

function normalizePhone(p) {
  if (!p) return "";
  let s = String(p).trim().replace(/[\s\-\(\)]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  console.log("Register called, body:", req.body);
  try {
    await dbConnect();
  } catch (err) {
    console.error("DB connect failed:", err);
    return res.status(500).json({ error: "DB connect failed" });
  }

  const { email, phone, password } = req.body || {};
  if (!email && !phone) return res.status(400).json({ error: "email or phone required" });

  const normPhone = phone ? normalizePhone(phone) : undefined;
  try {
    const existing = await User.findOne({
      $or: [
        ...(email ? [{ email: email }] : []),
        ...(normPhone ? [{ phone: normPhone }] : []),
      ],
    });
    if (existing) return res.status(400).json({ error: "User exists" });

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const u = await User.create({
      email: email || undefined,
      phone: normPhone || undefined,
      passwordHash: hash,
      isPhoneVerified: !!normPhone && false,
    });

    return res.status(201).json({ ok: true, userId: u._id, email: u.email, phone: u.phone });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
