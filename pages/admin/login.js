// pages/admin/login.js (frontend)
import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("login response:", res.status, data);

      if (!res.ok) throw new Error(data.error || "Login gagal");

      // Simpan flag + token (jika ada)
      localStorage.setItem("adminLoggedIn", "true");
      if (data.token) localStorage.setItem("adminToken", data.token);

      // redirect ke dashboard
      router.push("/admin/dashboard");
    } catch (err) {
      alert("Login error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
      <button type="submit" disabled={loading}>{loading ? "Logging..." : "Login"}</button>
    </form>
  );
}
