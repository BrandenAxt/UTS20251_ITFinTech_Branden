import dbConnect from "../../lib/db";
import Payment from "models/Payment";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    const { checkoutId, amount } = req.body;
    const payment = await Payment.create({ checkoutId, amount });
    return res.status(201).json(payment);
  }

  if (req.method === "GET") {
    const payments = await Payment.find({});
    return res.status(200).json(payments);
  }

  res.status(405).end();
}
