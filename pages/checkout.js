import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  // ----------------------------
  // UPDATE QTY
  // ----------------------------
  const updateQty = (id, delta) => {
    setCart((prevCart) => {
      const updated = prevCart
        .map((item) => {
          if (item._id !== id) return item;

          const currentQty = item.qty || 1;
          const newQty = currentQty + delta;

          if (newQty <= 0) return null;
          return { ...item, qty: newQty };
        })
        .filter(Boolean);

      localStorage.setItem("cart", JSON.stringify(updated));
      return updated;
    });
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );

  // HAPUS TAX → total = subtotal
  const total = subtotal;

  const handleCheckout = async () => {
    if (!cart || cart.length === 0) return alert("Cart kosong");

    const savedPhone =
      typeof window !== "undefined" ? localStorage.getItem("userPhone") : null;

    setLoadingCheckout(true);
    try {
      const body = {
        items: cart,
        total: total, // total tanpa tax
      };
      if (savedPhone) body.phone = savedPhone;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout gagal");

      const checkoutId = data._id || data.id || data.checkoutId;
      window.location.href = `/payment?checkoutId=${checkoutId}&amount=${total}`;
    } catch (err) {
      alert("Error: " + (err.message || err));
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-800 mr-6"
            >
              <div className="w-5 h-5 mr-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </div>
              <span className="text-sm font-large">Back to Store</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Shopping Cart
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                    >
                      {/* Image */}
                      <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={item.image || item.images?.[0]}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-base mb-1">
                          {item.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Rp{(item.price || 0).toLocaleString()} per item
                        </p>

                        {/* Qty */}
                        <div className="flex items-center mt-3 space-x-3">
                          <button
                            onClick={() => updateQty(item._id, -1)}
                            className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg"
                          >
                            -
                          </button>

                          <span className="w-12 text-center font-semibold">
                            {item.qty}
                          </span>

                          <button
                            onClick={() => updateQty(item._id, 1)}
                            className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          Rp
                          {((item.price || 0) * (item.qty || 1)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      Rp{subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* TAX DIHAPUS */}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-800">
                      <span>Total</span>
                      <span>Rp{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loadingCheckout}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold text-lg"
                >
                  {loadingCheckout ? "Processing..." : "Pay"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
