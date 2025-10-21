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

export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", category: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

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

      // orders
      try {
        const o = await fetchJsonSafe("/api/admin/orders-from-payments", token);
        setOrders(Array.isArray(o) ? o : (o.data || []));
      } catch (e) {
        console.warn("orders fetch failed", e);
        setOrders([]);
      }

      // stats (try admin path then public fallback)
      const statsCandidates = [
        "/api/admin/stats-from-payments?period=daily&days=30",
        "/api/stats-from-payments?period=daily&days=30",
      ];
      let stats = [];
      for (const url of statsCandidates) {
        try {
          const r = await fetchJsonSafe(url, token);
          if (Array.isArray(r)) { stats = r; break; }
          if (r?.data && Array.isArray(r.data)) { stats = r.data; break; }
        } catch (err) {
          console.warn("stats candidate failed", url, err);
        }
      }
      setChartData(stats);

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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em" }}>DASHBOARD</h1>
        <div style={{ color: "#666", fontSize: 14 }}>
          {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
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