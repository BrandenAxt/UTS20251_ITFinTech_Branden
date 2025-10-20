// scripts/seed-admin.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // <- biar .env.local otomatis kebaca

import dbConnect from "../lib/db.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";

(async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await dbConnect();
    console.log("✅ MongoDB connected successfully");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const existing = await Admin.findOne({ username: "admin" });
    if (!existing) {
      await Admin.create({
        username: "admin",
        password: hashedPassword,
      });
      console.log("✅ Admin user created: admin / admin123");
    } else {
      console.log("⚠️ Admin already exists");
    }
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
  } finally {
    process.exit();
  }
})();
