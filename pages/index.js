import { useState } from "react";

export default function Home() {
  const products = [
    { id: 1, name: "Pulsa 50K", price: 50000 },
    { id: 2, name: "Pulsa 100K", price: 100000 },
    { id: 3, name: "Data 5GB", price: 75000 },
  ];

  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    const updated = [...cart, product];
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Select Items</h1>
      {products.map((p) => (
        <div key={p.id}>
          <p>
            {p.name} - Rp {p.price.toLocaleString()}
          </p>
          <button onClick={() => addToCart(p)}>Add to Cart</button>
        </div>
      ))}
      <br />
      <a href="/checkout">Go to Checkout</a>
    </div>
  );
}
