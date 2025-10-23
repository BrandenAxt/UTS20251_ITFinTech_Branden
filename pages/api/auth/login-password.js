// pages/api/auth/login-password.js
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change_me_user_secret";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();

  const { identifier, password } = req.body || {}; // identifier = email or phone
  if (!identifier || !password) return res.status(400).json({ error: "identifier & password required" });

  try {
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Password salah" });

    const token = jwt.sign({ userId: user._id, email: user.email, phone: user.phone }, SECRET, { expiresIn: "8h" });
    return res.status(200).json({ message: "Login berhasil", token });
  } catch (err) {
    console.error("user login error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
