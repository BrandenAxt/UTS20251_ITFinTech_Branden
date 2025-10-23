// pages/api/admin/register.js
import dbConnect from "../../../lib/db";
import Admin from "../../../models/Admin";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username & password required" });
  try {
    const existing = await Admin.findOne({ username });
    if (existing) return res.status(409).json({ error: "Admin already exists" });
    const hash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, password: hash, email });
    return res.status(201).json({ ok: true, admin: { _id: admin._id, username: admin.username } });
  } catch (err) {
    console.error("admin register error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
