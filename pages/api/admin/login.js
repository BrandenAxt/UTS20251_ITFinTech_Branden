// pages/api/admin/login.js
import dbConnect from "../../../lib/db.js";
import Admin from "../../../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "fallback_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { username, password } = req.body ?? {};
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Admin tidak ditemukan" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Password salah" });
    }

    const token = jwt.sign(
      { adminId: admin._id, username: admin.username },
      SECRET,
      { expiresIn: "8h" }
    );

    console.log(`✅ Admin login success: ${admin.username}`);

    return res.status(200).json({
      message: "Login berhasil",
      admin: {
        id: admin._id,
        username: admin.username,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
