// pages/admin/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

function fetcher(url, token){ return fetch(url, { headers: { Authorization: "Bearer "+token } }).then(r=>r.json()); }

export default function Dashboard(){
  const [orders,setOrders] = useState([]);
  const [chartData,setChartData] = useState([]);
  const router = useRouter();

  useEffect(()=>{
    const token = localStorage.getItem("adminToken");
    if (!token) { router.push("/admin/login"); return; }
    fetcher("/api/admin/orders-from-payments", token).then(setOrders).catch(console.error);
    fetcher("/api/admin/stats-from-payments?period=daily&days=30", token).then(setChartData).catch(console.error);
  }, []);

  return (
    <div style={{padding:20}}>
      <h1>Admin Dashboard</h1>

      <section style={{marginTop:20}}>
        <h3>Omset (30 hari)</h3>
        <div style={{width:"100%", height:240}}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="date" minTickGap={10} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{marginTop:24}}>
        <h3>Recent Transactions</h3>
        <table border="1" cellPadding="8" cellSpacing="0" style={{width:"100%", marginTop:8}}>
          <thead><tr><th>_id</th><th>checkoutId</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id}>
                <td style={{maxWidth:250, overflow:"hidden"}}>{o._id}</td>
                <td>{o.checkoutId}</td>
                <td>{o.amount?.toLocaleString()}</td>
                <td>{o.status}</td>
                <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{marginTop:20}}>
        <button onClick={()=>router.push("/admin/products")}>Manage Products</button>
      </div>
    </div>
  );
}
