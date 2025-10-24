import dbConnect from "../../../lib/db";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || "change_me";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();
  } catch (err) {
    console.error("DB connect failed:", err);
    return res.status(500).json({ error: "DB connect failed" });
  }

  const { email, phone, password } = req.body || {};
  if ((!email && !phone) || !password) {
    return res.status(400).json({ error: "email or phone and password required" });
  }

  const q = {};
  if (email) q.email = email;
  else {
    let s = String(phone || "").trim().replace(/[\s\-\(\)]/g, "");
    if (s.startsWith("+")) s = s.slice(1);
    if (s.startsWith("0")) s = "62" + s.slice(1);
    q.phone = s;
  }

  try {
    const user = await User.findOne(q);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!user.passwordHash)
      return res.status(401).json({ error: "No password set for this account" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id, email: user.email || undefined, phone: user.phone || undefined },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      ok: true,
      token,
      user: { _id: user._id, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
