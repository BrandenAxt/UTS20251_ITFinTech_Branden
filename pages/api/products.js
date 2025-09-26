import dbConnect from "../../lib/db";
import Product from "../../models/product";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const products = await Product.find({});
    return res.status(200).json(products);
  }

  if (req.method === "POST") {
    const { name, category, price } = req.body;
    const product = await Product.create({ name, category, price });
    return res.status(201).json(product);
  }

  res.status(405).end(); // Method Not Allowed
}
