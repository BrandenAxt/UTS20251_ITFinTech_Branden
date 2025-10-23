// pages/api/auth/register.js
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();
  const { email, phone, password } = req.body || {};
  if (!email && !phone) return res.status(400).json({ error: "email or phone required" });
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return res.status(400).json({ error: "User exists" });

  const hash = password ? await bcrypt.hash(password, 10) : null;
  const u = await User.create({ email, phone, passwordHash: hash });
  return res.status(201).json({ ok: true, userId: u._id });
}
