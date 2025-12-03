import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ============================================================
  // LOCAL IMAGES
  // ============================================================
  const productImages = {
    "coffee latte": "/products/coffee_latte.jpg",
    "joca coffee": "/products/joca_coffee.jpg",
    "vanilla latte": "/products/vanilla_latte.jpg",
    "cappuccino": "/products/cappuccino.jpg",
    "americano": "/products/americano.jpg",
    "vietnam drip": "/products/vietnam_drip.jpg",
    "v60": "/products/v60.jpg",
    "moccacino": "/products/moccacino.jpg",
    "caramel latte": "/products/caramel_latte.jpg",
    "hazelnut latte": "/products/hazelnut_latte.jpg",
    "palm sugar latte": "/products/palm_sugar_latte.jpg",

    "caramel milkshake": "/products/caramel_milkshake.jpg",
    "choco milkshake": "/products/choco_milkshake.jpg",
    "vanilla milkshake": "/products/vanilla_milkshake.jpg",
    "soda gembira": "/products/soda_gembira.jpg",
    "lemon squash": "/products/lemon_squash.jpg",
    "lemon tea": "/products/lemon_tea.jpg",

    "french fries": "/products/french_fries.jpg",
    "chicken stick": "/products/chicken_stick.jpg",
    "mix plate": "/products/mix_plate.jpg",
    "indomie": "/products/indomie.jpg",

    default: "/products/default.jpg",
  };

  const getProductImage = (product) => {
    const name = product.name?.toLowerCase() || "";
    return productImages[name] || productImages.default;
  };

  // ============================================================
  // FETCH PRODUCTS
  // ============================================================
  useEffect(() => {
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
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userLoggedIn");
    window.location.href = "/admin/login";
  };

  const cartItemCount = cart.reduce((s, i) => s + (i.qty || 0), 0);

  // ============================================================
  // CATEGORY LIST
  // ============================================================
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  // ============================================================
  // FILTER
  // ============================================================
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    const name = p.name?.toLowerCase() || "";
    const categoryLower = p.category?.toLowerCase() || "";
    const description = p.description?.toLowerCase() || "";

    if (activeCategory !== "All" && p.category !== activeCategory) {
      return false;
    }

    if (!term) return true;

    return (
      name.includes(term) ||
      categoryLower.includes(term) ||
      description.includes(term)
    );
  });

  // ============================================================
  // PAGE RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            <div className="flex items-center space-x-6">
              <div className="w-6 h-6 text-gray-600 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </div>

              <span className="text-xl font-bold text-black">JOCA COFFEE</span>

              {/* SEARCH DESKTOP */}
              <div className="hidden md:block">
                <div className="relative w-80">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>

                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* CART + PROFILE */}
            <div className="flex items-center space-x-4">

              <a
                href="/checkout"
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg"
              >
                <span>Cart</span>
                {cartItemCount > 0 && (
                  <span className="bg-gray-700 text-white text-xs rounded-full px-2">
                    {cartItemCount}
                  </span>
                )}
              </a>

              <div className="relative">
                <button
                  onClick={() => setShowLogoutPopup(!showLogoutPopup)}
                  className="w-10 h-10 bg-black rounded-full text-white flex items-center justify-center"
                >
                  N
                </button>

                {showLogoutPopup && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLogoutPopup(false)} />

                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border z-50">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* SEARCH MOBILE */}
      <div className="md:hidden bg-white border-b px-4 py-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* CATEGORY */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 text-sm rounded-full ${
                activeCategory === category
                  ? "bg-black text-white"
                  : "bg-white border text-gray-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md"
            >
              <div className="w-full h-48 bg-gray-100 overflow-hidden">
                <img
                  src={getProductImage(p)}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5">

                {/* NAME → HITAM */}
                <h3 className="font-semibold text-black text-lg">
                  {p.name}
                </h3>

                {/* PRICE → HITAM */}
                <p className="text-xl font-bold text-black mt-1">
                  Rp {p.price.toLocaleString()}
                </p>

                {/* DESCRIPTION REMOVED */}

                <button
                  onClick={() => addToCart(p)}
                  className="w-full bg-black text-white py-2 rounded-lg mt-4"
                >
                  Add to Cart
                </button>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
