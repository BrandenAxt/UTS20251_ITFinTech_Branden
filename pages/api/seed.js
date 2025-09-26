import dbConnect from "../../lib/db";
import Product from "../../models/Product";
import Checkout from "../../models/Checkout";
import Payment from "../../models/Payment";

export default async function handler(req, res) {
  await dbConnect();

  // Dummy data
  const products = [
    { name: "Pulsa 50K", category: "Pulsa", price: 50000 },
    { name: "Pulsa 100K", category: "Pulsa", price: 100000 },
    { name: "Data 5GB", category: "Data", price: 75000 }
  ];

  await Product.deleteMany({});
  const insertedProducts = await Product.insertMany(products);

  const checkout = await Checkout.create({
    items: [insertedProducts[0]._id, insertedProducts[1]._id],
    total: insertedProducts[0].price + insertedProducts[1].price,
    status: "PENDING",
  });

  await Payment.deleteMany({});
  const payment = await Payment.create({
    checkoutId: checkout._id,
    amount: checkout.total,
    status: "LUNAS",
  });

  res.status(200).json({
    message: "Seeding sukses!",
    products: insertedProducts,
    checkout,
    payment,
  });
}
