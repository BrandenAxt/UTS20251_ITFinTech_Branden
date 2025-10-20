// lib/adminAuth.js
import jwt from "jsonwebtoken";
import dbConnect from "./db";
import Admin from "../models/Admin";

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "change_me";

export function signAdminToken(admin) {
  return jwt.sign({ adminId: admin._id, email: admin.email }, SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, SECRET);
}

export function requireAdmin(handler) {
  return async (req, res) => {
    try {
      const auth = (req.headers.authorization || "").split(" ")[1];
      if (!auth) return res.status(401).json({ error: "Unauthorized" });
      const payload = verifyAdminToken(auth);
      await dbConnect();
      const admin = await Admin.findById(payload.adminId);
      if (!admin) return res.status(401).json({ error: "Unauthorized" });
      req.admin = admin;
      return handler(req, res);
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized", detail: e.message });
    }
  };
}
