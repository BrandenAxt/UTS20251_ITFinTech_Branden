import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const updateQty = (id, delta) => {
    const updated = cart.map((item) =>
      item._id === id ? { ...item, qty: Math.max(1, (item.qty || 1) + delta) } : item
    );
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );

  const tax = Math.round(subtotal * 0.1); // 10% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total: total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout gagal");

      const checkoutId = data._id || data.id;
      // Replace with your navigation method
      window.location.href = `/payment?checkoutId=${checkoutId}&amount=${total}`;
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleBack = () => {
    window.location.href = '/';
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="text-sm font-large">Back to Store</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

              <h2 className="text-lg font-semibold text-gray-800 mb-6">Shopping Cart</h2>
              
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 3H3m4 10v6a1 1 0 001 1h8a1 1 0 001-1v-6m-9 0h10" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-1">Add some products to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name || "Nike Product"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                            }}
                          />
                        ) : item.images && item.images.length > 0 ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.name || "Nike Product"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-base mb-1">
                          {item.name || "Product Name"}
                        </h3>
                        {item.category && (
                          <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                        )}
                        <p className="text-gray-600 text-sm">
                          Rp{(item.price || 0).toLocaleString()} per item
                        </p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center mt-3 space-x-3">
                          <span className="text-sm text-gray-600 font-medium">Quantity:</span>
                          <button
                            onClick={() => updateQty(item._id, -1)}
                            className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                            disabled={item.qty <= 1}
                          >
                            <div className="w-4 h-4">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </div>
                          </button>
                          
                          <span className="w-12 text-center font-semibold text-gray-800 bg-white border border-gray-200 rounded px-2 py-1">
                            {item.qty || 1}
                          </span>
                          
                          <button
                            onClick={() => updateQty(item._id, 1)}
                            className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <div className="w-4 h-4">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          Rp{((item.price || 0) * (item.qty || 1)).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Total for {item.qty || 1} item{(item.qty || 1) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Section */}
          {cart.length > 0 && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">Rp{subtotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (10%)</span>
                    <span className="font-medium">Rp{tax.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-800">
                      <span>Total</span>
                      <span>Rp{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2 transition-colors shadow-md"
                >
                  <span>Pay</span>
                  <div className="w-5 h-5">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}