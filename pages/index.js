import { useEffect, useState } from "react";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    // fetch products dari backend (MongoDB)
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Gagal fetch products", err);
      }
    }
    loadProducts();

    // load cart dari localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  const addToCart = (product) => {
    const existing = cart.find((c) => c._id === product._id);
    let updated;
    if (existing) {
      updated = cart.map((c) =>
        c._id === product._id ? { ...c, qty: (c.qty || 1) + 1 } : c
      );
    } else {
      updated = [...cart, { ...product, qty: 1 }];
    }
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const categories = ["All", "Drinks", "Snacks", "Bundle"];
  const cartItemCount = cart.reduce((s, i) => s + (i.qty || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Logo</h1>
            </div>
            
            {/* Search Bar - Desktop */}
            <div className="hidden md:block flex-1 max-w-lg mx-8">
              <div className="relative">
                <div className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="relative">
              <a 
                href="/checkout"
                className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <div className="w-5 h-5">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8L5 3H3m4 10v6a1 1 0 001 1h8a1 1 0 001-1v-6m-9 0h10" />
                  </svg>
                </div>
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <span className="bg-gray-700 text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center">
                    {cartItemCount}
                  </span>
                )}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Mobile */}
      <div className="md:hidden bg-white border-b px-4 py-3">
        <div className="relative">
          <div className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-colors ${
                activeCategory === category
                  ? "bg-black text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <p className="text-gray-500 text-lg">No products found.</p>
              <p className="text-gray-400 text-sm mt-2">Coba /api/seed dulu.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                {/* Product Image Placeholder */}
                <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                </div>
                
                {/* Product Info */}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 text-lg mb-2">
                    {p.name || "Product Name"}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    Rp {p.price ? p.price.toLocaleString() : "$$$$"}
                  </p>
                  <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden">
                    {p.description || "Short description of the product"}
                  </p>
                  
                  {/* Add Button */}
                  <button
                    onClick={() => addToCart(p)}
                    className="w-full bg-black hover:bg-gray-800 text-white py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors"
                  >
                    <span>Add to Cart</span>
                    <div className="w-4 h-4">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}