// pages/admin/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

async function fetchJsonSafe(url, token, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(url, { ...opts, headers });
  const txt = await res.text();
  try {
    const json = JSON.parse(txt);
    if (!res.ok) throw { status: res.status, payload: json };
    return json;
  } catch (e) {
    if (!res.ok) throw { status: res.status, payload: txt };
    return txt;
  }
}

// helper: build array of YYYY-MM-DD strings for last N days (older -> newer)
function buildDateRange(days) {
  const arr = [];
  const now = new Date();
  // create from days-1 days ago up to today
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    arr.push(`${yyyy}-${mm}-${dd}`);
  }
  return arr;
}

export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", category: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorInfo(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
      const loggedFlag = typeof window !== "undefined" ? localStorage.getItem("adminLoggedIn") : null;
      if (!token && !loggedFlag) {
        router.replace("/admin/login");
        return;
      }

      // 1) Fetch orders from payments endpoint (this is your source)
      let fetchedOrders = [];
      try {
        const o = await fetchJsonSafe("/api/admin/orders-from-payments", token);
        fetchedOrders = Array.isArray(o) ? o : (o.data || []);
        setOrders(fetchedOrders);
      } catch (e) {
        console.warn("orders fetch failed", e);
        fetchedOrders = [];
        setOrders([]);
      }

      // ---------------------------
      // ANALYTICS: build chartData from orders-from-payments
      // - We take last `days` days and aggregate amounts for status "LUNAS"
      // - createdAt may be present or not; if missing we parse ObjectId timestamp
      // ---------------------------
      (function buildAnalyticsFromOrders() {
        const days = 30;
        const since = new Date();
        since.setDate(since.getDate() - (days - 1)); // include today

        // create map date -> total
        const map = {};

        if (Array.isArray(fetchedOrders) && fetchedOrders.length) {
          fetchedOrders.forEach((p) => {
            try {
              // Only count paid orders (status "LUNAS")
              if (p.status && String(p.status).toUpperCase() !== "LUNAS") return;

              // determine created date
              let created = null;
              if (p.createdAt) {
                created = new Date(p.createdAt);
              } else if (p._id) {
                // try to extract timestamp from ObjectId
                try {
                  const hex = String(p._id).slice(0, 8);
                  const secs = parseInt(hex, 16);
                  created = new Date(secs * 1000);
                } catch (e) {
                  created = null;
                }
              }

              if (!created || isNaN(created.getTime())) return;
              if (created < since) return; // outside range

              // YYYY-MM-DD key
              const dateKey = created.toISOString().slice(0, 10);
              const amount = Number(p.amount || 0);
              map[dateKey] = (map[dateKey] || 0) + (Number.isFinite(amount) ? amount : 0);
            } catch (e) {
              // ignore bad rows
            }
          });
        }

        // build continuous array for last `days`
        const dateRange = buildDateRange(days);
        const normalizedStats = dateRange.map((d) => ({
          date: d,
          total: Number(map[d] || 0),
        }));

        setChartData(normalizedStats);
      })();

      // products
      try {
        const p = await fetchJsonSafe("/api/products", token);
        setProducts(Array.isArray(p) ? p : (p.data || []));
      } catch (e) {
        console.error("products fetch failed", e);
        setProducts([]);
      }

      setLoading(false);
    })();
  }, [router]);

  const handleLogout = () => {
    // Clear all auth tokens and login states
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userLoggedIn");
    
    // Redirect to login page
    router.push("/admin/login");
  };

  // create / update product
  async function handleAddOrUpdateProduct(e) {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    const body = {
      name: String(productForm.name || "").trim(),
      category: String(productForm.category || "").trim(),
      price: Number(productForm.price || 0),
    };
    if (!body.name || !body.price) return alert("Name and price required");

    try {
      if (editingId) {
        const res = await fetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: token ? "Bearer " + token : "" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Update failed");
        }
        const updated = await res.json();
        setProducts((p) => p.map((x) => (x._id === updated._id ? updated : x)));
        setEditingId(null);
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token ? "Bearer " + token : "" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Create failed");
        }
        const created = await res.json();
        setProducts((p) => [created, ...p]);
      }
      setProductForm({ name: "", category: "", price: "" });
    } catch (err) {
      console.error("Product save error:", err);
      alert("Error saving product: " + (err.message || JSON.stringify(err)));
    }
  }

  function handleEditClick(prod) {
    setEditingId(prod._id);
    setProductForm({ name: prod.name || "", category: prod.category || "", price: prod.price || "" });
    const el = document.getElementById("manage-products-panel");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteProduct(id) {
    if (!confirm("Delete product?")) return;
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? "Bearer " + token : "" },
      });
      if (!res.ok) throw new Error("Delete failed");
      setProducts((p) => p.filter((x) => x._id !== id));
    } catch (err) {
      console.error("Delete product error:", err);
      alert("Delete failed");
    }
  }

  if (loading) return <div style={{ padding: 32, color: "#111", background: "#f5f5f5", minHeight: "100vh" }}>Loading admin dashboard...</div>;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.status === "LUNAS").length;

  return (
    <div style={{ padding: "24px 32px", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header with Logout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em" }}>DASHBOARD</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: "#666", fontSize: 14 }}>
            {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
          </div>
          
          {/* Profile Circle with Logout Popup */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLogoutPopup(!showLogoutPopup)}
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              A
            </button>

            {/* Logout Popup */}
            {showLogoutPopup && (
              <>
                {/* Backdrop */}
                <div 
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 40
                  }}
                  onClick={() => setShowLogoutPopup(false)}
                />
                
                {/* Popup Menu */}
                <div style={{
                  position: "absolute",
                  right: 0,
                  marginTop: 8,
                  width: 200,
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  border: "1px solid #e5e5e5",
                  zIndex: 50,
                  overflow: "hidden"
                }}>
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0"
                  }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Admin Account</p>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#666" }}>Manage your account</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#ef4444",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "inherit",
                      transition: "background 0.15s ease"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fef2f2"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Stats Cards - Black Background */}
      <div style={{ 
        background: "#1a1a1a", 
        borderRadius: 12, 
        padding: "28px 32px", 
        marginBottom: 28,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 40
      }}>
        <div>
          <div style={{ color: "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>TOTAL PAID REVENUE</div>
          <div style={{ color: "#fff", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{totalRevenue.toLocaleString()}</div>
          <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>Rp</div>
        </div>
        
        <div>
          <div style={{ color: "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>TOTAL ORDERS</div>
          <div style={{ color: "#fff", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{totalOrders}</div>
          <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>+0.00%</div>
        </div>

        <div>
          <div style={{ color: "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>PAID ORDERS</div>
          <div style={{ color: "#fff", fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{paidOrders}</div>
          <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>of {totalOrders}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* LEFT: New Orders */}
        <div style={{ background: "#fff", borderRadius: 12, overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>New Orders</h3>
          </div>
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#fafafa" }}>
                <tr style={{ textAlign: "left", color: "#666", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "12px 24px" }}>Order ID</th>
                  <th style={{ padding: "12px 24px" }}>Amount</th>
                  <th style={{ padding: "12px 24px" }}>Date</th>
                  <th style={{ padding: "12px 24px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length ? (
                  orders.map((o, idx) => (
                    <tr key={o._id} style={{ borderBottom: idx !== orders.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                      <td style={{ padding: "16px 24px", color: "#333", fontSize: 13, fontFamily: "monospace" }}>{o.checkoutId || "(no checkoutId)"}</td>
                      <td style={{ padding: "16px 24px", fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>Rp {Number(o.amount || 0).toLocaleString()}</td>
                      <td style={{ padding: "16px 24px", color: "#666", fontSize: 12 }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) + ', ' + new Date(o.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: o.status === "LUNAS" ? "#d1fae5" : "#fef3c7",
                          color: o.status === "LUNAS" ? "#065f46" : "#92400e",
                          display: "inline-block",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em"
                        }}>
                          {o.status === "LUNAS" ? "PAID" : "WAITING"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} style={{ padding: 24, color: "#999", textAlign: "center" }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Analytics + Manage Products */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Analytics Chart */}
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e5e5" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Analytics (30 days)</h3>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" stroke="#999" style={{ fontSize: 11 }} />
                    <YAxis stroke="#999" style={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 12 }} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Manage Products */}
          <div id="manage-products-panel" style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e5e5" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Manage Products</h3>
            </div>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
              <form onSubmit={handleAddOrUpdateProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "start" }}>
                <input 
                  placeholder="Name" 
                  value={productForm.name} 
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} 
                  style={{ 
                    padding: "10px 12px", 
                    border: "1px solid #e0e0e0", 
                    borderRadius: 6, 
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit"
                  }} 
                />
                <input 
                  placeholder="Category" 
                  value={productForm.category} 
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} 
                  style={{ 
                    padding: "10px 12px", 
                    border: "1px solid #e0e0e0", 
                    borderRadius: 6, 
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit"
                  }} 
                />
                <input 
                  placeholder="Price" 
                  type="number" 
                  value={productForm.price} 
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} 
                  style={{ 
                    padding: "10px 12px", 
                    border: "1px solid #e0e0e0", 
                    borderRadius: 6, 
                    fontSize: 14,
                    width: 120,
                    outline: "none",
                    fontFamily: "inherit"
                  }} 
                />
                <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
                  <button 
                    type="submit" 
                    style={{ 
                      padding: "10px 20px", 
                      background: "#1a1a1a", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: 6, 
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    {editingId ? "Update" : "Add"}
                  </button>
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingId(null); setProductForm({ name: "", category: "", price: "" }); }} 
                      style={{ 
                        padding: "10px 20px", 
                        background: "#f0f0f0", 
                        color: "#333", 
                        border: "none", 
                        borderRadius: 6, 
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit"
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {products.length ? products.map((p, idx) => (
                <div 
                  key={p._id} 
                  style={{ 
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    gap: 12,
                    padding: "16px 24px", 
                    borderBottom: idx !== products.length - 1 ? "1px solid #f5f5f5" : "none",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 2 }}>{p.name}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>{p.category} — Rp {Number(p.price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ color: "#999", fontSize: 13 }}></div>
                  <button 
                    onClick={() => handleEditClick(p)} 
                    style={{ 
                      padding: "6px 14px", 
                      background: "transparent", 
                      color: "#333", 
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p._id)} 
                    style={{ 
                      padding: "6px 14px", 
                      background: "transparent", 
                      color: "#ef4444", 
                      border: "none",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    Delete
                  </button>
                </div>
              )) : (
                <div style={{ padding: 24, color: "#999", textAlign: "center" }}>No products yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
