// pages/admin/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

async function fetchJson(url, token) {
  const headers = token ? { Authorization: "Bearer " + token } : {};
  const res = await fetch(url, { headers });
  // If server returns non-json (html) or error, handle it
  const txt = await res.text();
  try {
    const json = JSON.parse(txt);
    if (!res.ok) throw { status: res.status, payload: json };
    return json;
  } catch (e) {
    // not valid json or parse error
    if (!res.ok) throw { status: res.status, payload: txt };
    // if txt is valid JSON string not parsed above, return as fallback
    try { return JSON.parse(txt); } catch { return txt; }
  }
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      setLoading(true);
      setFetchError(null);

      const token = localStorage.getItem("adminToken");
      const loggedFlag = localStorage.getItem("adminLoggedIn");
      if (!token && !loggedFlag) {
        router.replace("/admin/login");
        return;
      }

      try {
        const o = await fetchJson("/api/admin/orders-from-payments", token);
        console.log("DEBUG orders response:", o);
        // If backend returns object with .data or something, normalize here
        if (Array.isArray(o)) {
          setOrders(o);
        } else if (o && Array.isArray(o.data)) {
          setOrders(o.data);
        } else {
          // Not an array — set to empty and keep the payload for debugging
          setOrders([]);
          setFetchError({ message: "Unexpected orders response", payload: o });
          console.warn("Unexpected orders response shape:", o);
        }

        const s = await fetchJson("/api/admin/stats-from-payments?period=daily&days=30", token);
        console.log("DEBUG stats response:", s);
        if (Array.isArray(s)) setChartData(s);
        else setChartData([]);
      } catch (err) {
        console.error("Fetch dashboard error:", err);
        setFetchError(err);
        // if unauthorized, clear and redirect
        if (err?.status === 401) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminLoggedIn");
          router.replace("/admin/login");
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      {fetchError && (
        <div style={{ margin: "12px 0", padding: 12, background: "#fee", border: "1px solid #f99" }}>
          <strong>Error fetching dashboard data:</strong>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
            {JSON.stringify(fetchError, null, 2)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 20 }}>
        {/* LEFT: Checkout List */}
        <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <h3>Checkout</h3>
          <div style={{ maxHeight: 380, overflowY: "auto", marginTop: 10 }}>
            {Array.isArray(orders) && orders.length > 0 ? (
              orders.map((o) => (
                <div key={o._id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#666" }}>{o.checkoutId || "(no checkoutId)"}</div>
                    <div style={{ fontWeight: 600 }}>Rp {Number(o.amount || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontWeight: 700,
                      background: o.status === "LUNAS" ? "#d1fae5" : "#fff7cc",
                      color: o.status === "LUNAS" ? "#065f46" : "#92400e"
                    }}>
                      {o.status === "LUNAS" ? "PAID" : "WAITING PAYMENT"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 12, color: "#666" }}>No orders to show.</div>
            )}
          </div>
        </div>

        {/* RIGHT: Analytics placeholder */}
        <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <h3>Analytics</h3>
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
      </div>
    </div>
  );
}
