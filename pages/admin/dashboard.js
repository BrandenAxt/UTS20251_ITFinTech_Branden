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

      // load orders
      try {
        const o = await fetchJsonSafe("/api/admin/orders-from-payments", token);
        setOrders(Array.isArray(o) ? o : (o.data || []));
      } catch (e) {
        console.warn("orders fetch failed", e);
        setOrders([]);
      }

      // load stats (try admin path then fallback)
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
        } catch (e) {
          console.warn("stats candidate failed", url, e);
        }
      }
      setChartData(stats);

      // load products
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

  // product actions
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
        // update
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
        setProducts(p => p.map(x => (x._id === updated._id ? updated : x)));
        setEditingId(null);
      } else {
        // create (public endpoint)
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
        setProducts(p => [created, ...p]);
      }
      setProductForm({ name: "", category: "", price: "" });
    } catch (err) {
      console.error("Product save error:", err);
      alert("Error saving product: " + (err.message || JSON.stringify(err)));
    }
  }

  async function handleEditClick(prod) {
    setEditingId(prod._id);
    setProductForm({ name: prod.name || "", category: prod.category || "", price: prod.price || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setProducts(p => p.filter(x => x._id !== id));
    } catch (err) {
      console.error("Delete product error:", err);
      alert("Delete failed");
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading admin dashboard...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>

      {errorInfo && (
        <div style={{ background: "#fff0f0", padding: 12, marginBottom: 12 }}>
          <strong>Warning</strong>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(errorInfo, null, 2)}</pre>
        </div>
      )}

      {/* Top: product form */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 8, marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 8px 0" }}>{editingId ? "Edit Product" : "Add Product"}</h3>
        <form onSubmit={handleAddOrUpdateProduct} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="Name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
          <input placeholder="Category" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} />
          <input placeholder="Price" type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
          <button type="submit" style={{ padding: "8px 12px" }}>{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" onClick={()=>{ setEditingId(null); setProductForm({name:"",category:"",price:""}); }}>Cancel</button>}
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* Left: Checkout list */}
        <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
          <h3 className="text-lg font-semibold mb-3">Checkout</h3>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {orders.length ? orders.map(o => (
              <div key={o._id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 8px", borderBottom: "1px solid #eee" }}>
                <div>
                  <div style={{ color: "#666", fontSize: 13 }}>{o.checkoutId || "(no checkoutId)"}</div>
                  <div style={{ fontWeight: 700 }}>Rp {Number(o.amount || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontWeight: 700,
                    background: o.status === "LUNAS" ? "#d1fae5" : "#fff7cc",
                    color: o.status === "LUNAS" ? "#065f46" : "#92400e"
                  }}>{o.status === "LUNAS" ? "PAID" : "WAITING"}</span>
                </div>
              </div>
            )) : <div style={{ padding: 12, color: "#666" }}>No orders</div>}
          </div>
        </div>

        {/* Right: Analytics + Manage products list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
            <h3>Analytics (30 days)</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
            <h3>Manage Products</h3>
            <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 8 }}>
              {products.length ? products.map(p => (
                <div key={p._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ color: "#777", fontSize: 12 }}>{p.category} — Rp {Number(p.price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEditClick(p)} style={{ padding: "6px 8px" }}>Edit</button>
                    <button onClick={() => handleDeleteProduct(p._id)} style={{ padding: "6px 8px", background: "#fee2e2" }}>Delete</button>
                  </div>
                </div>
              )) : <div style={{ color: "#666" }}>No products</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
