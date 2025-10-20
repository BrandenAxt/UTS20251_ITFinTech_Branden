// pages/api/admin/products/[id].js
import dbConnect from "../../../../lib/db";
import Product from "../../../../models/Product";
import { requireAdmin } from "../../../../lib/adminAuth";

async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;
  if (req.method === "GET") {
    const p = await Product.findById(id);
    if (!p) return res.status(404).end();
    return res.json(p);
  }
  if (req.method === "PUT") {
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    return res.json(updated);
  }
  if (req.method === "DELETE") {
    await Product.findByIdAndDelete(id);
    return res.status(204).end();
  }
  return res.status(405).end();
}

export default requireAdmin(handler);
