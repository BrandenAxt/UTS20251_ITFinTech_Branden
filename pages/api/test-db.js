import dbConnect from "../../lib/db";

export default async function handler(req, res) {
  try {
    await dbConnect();
    res.status(200).json({ success: true, message: "Connected to MongoDB!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "DB connection failed" });
  }
}
