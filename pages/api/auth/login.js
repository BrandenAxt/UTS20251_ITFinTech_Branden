// pages/api/auth/login.js
import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change_me";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await dbConnect();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email & password required" });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "User not found" });
  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ userId: user._id, email: user.email }, SECRET, { expiresIn: "8h" });
  return res.status(200).json({ token });
}
