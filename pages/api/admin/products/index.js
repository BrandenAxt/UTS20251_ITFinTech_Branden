// pages/api/admin/products/index.js
import dbConnect from "../../../../lib/db";
import Product from "../../../../models/Product";
import { requireAdmin } from "../../../../lib/adminAuth";

async function handler(req, res) {
  await dbConnect();
  if (req.method === "GET") {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  }
  if (req.method === "POST") {
    const p = await Product.create(req.body);
    return res.status(201).json(p);
  }
  return res.status(405).end();
}

export default requireAdmin(handler);
