import { useEffect, useState } from "react";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

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

  const handleLogout = () => {
    // Clear all auth tokens and login states
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userLoggedIn");
    // Optionally clear cart
    // localStorage.removeItem("cart");
    
    // Redirect to login page
    window.location.href = "/admin/login";
  };

  // Function to get product image based on product name/category
  const getProductImage = (product) => {
    const name = product.name?.toLowerCase() || "";
    const category = product.category?.toLowerCase() || "";
    
    if (name.includes("nike") && name.includes("air")) {
      return "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop";
    } else if (name.includes("cortez") || name.includes("nike")) {
      return "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop";
    } else if (category.includes("sports") || category.includes("basketball")) {
      return "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400&h=300&fit=crop";
    } else if (category.includes("running")) {
      return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop";
    } else if (category.includes("chill")) {
      return "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=300&fit=crop";
    } else {
      return "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop";
    }
  };

  const categories = ["All", "Sports", "Chill", "Basketball","Running"];
  const cartItemCount = cart.reduce((s, i) => s + (i.qty || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <div className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-800">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <div className="flex items-center">
                <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.8 5.1C2 4.4 1.6 3.5 1.6 2.4c0-.7.2-1.3.6-1.8.4-.5 1-.7 1.7-.7.8 0 1.4.3 1.9.8.5.6.7 1.3.7 2.2 0 .8-.2 1.5-.6 2.1-.4.6-1 1.1-1.8 1.5L2.8 5.1zM24 18.9c0 .6-.1 1.1-.4 1.5-.2.4-.6.7-1.1.9-.5.2-1 .3-1.6.3-.7 0-1.3-.1-1.8-.4-.5-.3-.9-.7-1.2-1.2-.3-.5-.4-1.1-.4-1.7 0-.8.2-1.5.6-2.1.4-.6.9-1.1 1.6-1.4.7-.3 1.4-.5 2.2-.5.9 0 1.6.2 2.2.6.6.4.9 1 .9 1.8v.2zM1.6 21.1c0-.4.1-.7.2-1 .1-.3.3-.5.5-.7.2-.2.4-.3.7-.4.3-.1.6-.1.9-.1.4 0 .7 0 1 .1.3.1.5.2.7.4.2.2.4.4.5.7.1.3.2.6.2 1s-.1.7-.2 1c-.1.3-.3.5-.5.7-.2.2-.4.3-.7.4-.3.1-.6.1-1 .1-.3 0-.6 0-.9-.1-.3-.1-.5-.2-.7-.4-.2-.2-.4-.4-.5-.7-.1-.3-.2-.6-.2-1z"/>
                </svg>
                <span className="ml-2 text-xl font-bold text-black">NIKE</span>
              </div>
              
              {/* Search Bar - Desktop - Moved closer to logo */}
              <div className="hidden md:block">
                <div className="relative w-80">
                  <div className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Cart Button */}
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

              {/* Profile Circle - Now Interactive */}
              <div className="relative">
                <button
                  onClick={() => setShowLogoutPopup(!showLogoutPopup)}
                  className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-semibold hover:from-gray-600 hover:to-gray-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span className="text-sm">N</span>
                </button>

                {/* Logout Popup */}
                {showLogoutPopup && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowLogoutPopup(false)}
                    ></div>
                    
                    {/* Popup Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Account</p>
                        <p className="text-xs text-gray-500">Manage your account</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
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
              <p className="text-gray-400 text-sm mt-2">Loading.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                {/* Product Image - Real images based on product */}
                <div className="w-full h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                  <img 
                    src={getProductImage(p)} 
                    alt={p.name || "Product"} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=300&fit=crop";
                    }}
                  />
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