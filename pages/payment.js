import { useEffect, useState } from "react";

export default function Payment() {
  const [cart, setCart] = useState([]);
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const handlePay = () => {
    alert("Simulasi pembayaran sukses! (nanti diganti dengan Xendit)");
    localStorage.removeItem("cart");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Payment Page</h1>
      <h3>Total: Rp {total.toLocaleString()}</h3>
      <button onClick={handlePay}>Pay Now</button>
    </div>
  );
}
