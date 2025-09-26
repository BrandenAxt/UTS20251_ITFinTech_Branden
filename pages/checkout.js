import { useEffect, useState } from "react";

export default function Checkout() {
  const [cart, setCart] = useState([]);
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Checkout</h1>
      {cart.map((item, idx) => (
        <p key={idx}>
          {item.name} - Rp {item.price.toLocaleString()}
        </p>
      ))}
      <h3>Total: Rp {total.toLocaleString()}</h3>
      <a href="/payment">Proceed to Payment</a>
    </div>
  );
}
