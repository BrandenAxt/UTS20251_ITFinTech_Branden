import dbConnect from "../../lib/db";
import Checkout from "models/Checkout";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    const { items, total } = req.body;
    const checkout = await Checkout.create({ items, total });
    return res.status(201).json(checkout);
  }

  if (req.method === "GET") {
    const checkouts = await Checkout.find({});
    return res.status(200).json(checkouts);
  }

  res.status(405).end();
}
