// pages/api/checkout.js
import dbConnect from "../../lib/db";
import Checkout from "../../models/Checkout";
import { nanoid } from "nanoid";

/**
 * Normalize phone to E.164-ish:
 * - remove spaces, dashes, parens
 * - if starts with 0 -> assume Indonesia (62)
 * - ensure starts with + (so +62...)
 * NOTE: This is a best-effort helper. Validate on frontend if you need stricter rules.
 */
function normalizePhone(raw) {
  if (!raw) return undefined;
  let s = String(raw).trim();
  s = s.replace(/[\s\-\(\)]/g, "");
  // if already starts with +, keep it
  if (s.startsWith("+")) return s;
  // if starts with 0 -> assume ID country code 62
  if (s.startsWith("0")) return "+62" + s.slice(1);
  // if starts with country code like 62 without plus
  if (/^62\d+/.test(s)) return "+" + s;
  // fallback: prepend +
  return "+" + s;
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const checkouts = await Checkout.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json(checkouts);
    } catch (err) {
      console.error("Checkout GET error:", err);
      return res.status(500).json({ error: "Failed to fetch checkouts" });
    }
  }

  if (req.method === "POST") {
    try {
      const { items, total, phone } = req.body || {};

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items required" });
      }
      if (typeof total === "undefined" || total === null || Number.isNaN(Number(total))) {
        return res.status(400).json({ error: "total required" });
      }

      const normalizedPhone = phone ? normalizePhone(phone) : undefined;
      const checkoutId = nanoid(10);

      const checkout = await Checkout.create({
        items,
        total: Number(total),
        phone: normalizedPhone,
        checkoutId,
        status: "PENDING",
      });

      return res.status(201).json({
        _id: checkout._id,
        checkoutId: checkout.checkoutId,
        amount: checkout.total,
        phone: checkout.phone,
      });
    } catch (err) {
      console.error("Checkout POST error:", err);
      return res.status(500).json({ error: "Failed to create checkout", detail: err.message });
    }
  }

  res.status(405).end();
}
