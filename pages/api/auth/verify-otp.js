// // pages/api/auth/verify-otp.js
// import dbConnect from "../../../lib/db";
// import Otp from "../../../models/Otp";
// import User from "../../../models/User";
// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.JWT_SECRET || "change_me";

// function normalizeVariants(p) {
//   // return array of variants to try when searching DB
//   if (!p) return [];
//   let s = String(p).trim().replace(/[\s\-\(\)]/g, "");
//   // remove leading +
//   if (s.startsWith("+")) s = s.slice(1);
//   const variants = [];
//   // raw digits (no +)
//   variants.push(s);
//   // with leading 62
//   if (!s.startsWith("62") && s.startsWith("0")) {
//     variants.push("62" + s.slice(1));
//   }
//   if (!s.startsWith("62") && !s.startsWith("0")) {
//     variants.push("62" + s);
//   }
//   // with plus
//   variants.push("+" + variants[0]);
//   // unique
//   return Array.from(new Set(variants));
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

//   const { phone, otp, role } = req.body || {};
//   if (!phone || !otp) return res.status(400).json({ error: "phone and otp are required" });

//   try {
//     await dbConnect();

//     const code = String(otp).trim();
//     const variants = normalizeVariants(phone);

//     // Try to find an unexpired OTP matching any phone variant
//     const now = new Date();
//     const doc = await Otp.findOne({
//       code,
//       phone: { $in: variants },
//       expiresAt: { $gte: now },
//     });

//     // Helpful debug logging (remove or tone down in production)
//     console.log("verify-otp: searching for", { code, variants });
//     if (!doc) {
//       // Try looser search to provide better error details (expired vs not found)
//       const foundAny = await Otp.findOne({ code, phone: { $in: variants } });
//       if (foundAny) {
//         console.warn("verify-otp: OTP found but expired:", { foundAnyId: foundAny._id, expiresAt: foundAny.expiresAt });
//         return res.status(400).json({ error: "OTP sudah kedaluwarsa" });
//       }

//       console.warn("verify-otp: OTP not found for any variant");
//       // For debugging: list recent OTPs for that phone variants (limit)
//       const recent = await Otp.find({ phone: { $in: variants } }).sort({ _id: -1 }).limit(5).lean();
//       console.log("verify-otp: recent OTP docs for variants:", recent);
//       return res.status(400).json({ error: "OTP tidak valid atau sudah kedaluwarsa" });
//     }

//     // Success: delete OTP (single use)
//     await Otp.deleteOne({ _id: doc._id });

//     // find or create user
//     let user = await User.findOne({ phone: doc.phone });
//     if (!user) {
//       user = await User.create({ phone: doc.phone, isPhoneVerified: true });
//     } else if (!user.isPhoneVerified) {
//       user.isPhoneVerified = true;
//       await user.save();
//     }

//     // issue JWT
//     const token = jwt.sign({ userId: user._id, phone: user.phone }, JWT_SECRET, { expiresIn: "7d" });
//     return res.status(200).json({ ok: true, token, user: { _id: user._id, phone: user.phone } });
//   } catch (err) {
//     console.error("Verify OTP error:", err);
//     return res.status(500).json({ error: "Internal server error", detail: err.message });
//   }
// }


// pages/api/auth/verify-otp.js
import dbConnect from "../../../lib/db";
import Otp from "../../../models/Otp";
import User from "../../../models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { phone, otp } = req.body || {};
    if (!phone || !otp) return res.status(400).json({ error: "phone and otp required" });

    let normalized = String(phone).trim();
    if (!normalized.startsWith("+")) {
      if (normalized.startsWith("0")) normalized = "+62" + normalized.slice(1);
      else normalized = "+" + normalized;
    }

    // find latest OTP for phone
    const doc = await Otp.findOne({ phone: normalized }).sort({ createdAt: -1 });
    if (!doc) return res.status(400).json({ error: "No OTP requested for this phone" });

    if (new Date() > new Date(doc.expiresAt)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (String(doc.code) !== String(otp).trim()) {
      // increment attempts
      doc.attempts = (doc.attempts || 0) + 1;
      await doc.save();
      if (doc.attempts >= 5) {
        return res.status(429).json({ error: "Too many attempts. Request a new code." });
      }
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // success: mark user verified, delete OTP doc or let TTL remove
    const user = await User.findOneAndUpdate({ phone: normalized }, { isPhoneVerified: true }, { new: true });
    await Otp.deleteMany({ phone: normalized }); // clean up all otps for phone

    // issue JWT (user auth)
    const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret";
    const token = jwt.sign({ sub: String(user._id), phone: user.phone }, jwtSecret, { expiresIn: "7d" });

    return res.status(200).json({ ok: true, token });
  } catch (err) {
    console.error("verify-otp error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
