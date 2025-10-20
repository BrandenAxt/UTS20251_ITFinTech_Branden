// pages/admin/login.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("🔹 Login response:", res.status, data);

      if (!res.ok) throw new Error(data.error || "Login gagal");

      // Simpan flag + token (jika tersedia)
      localStorage.setItem("adminLoggedIn", "true");

      if (data.token) {
        localStorage.setItem("adminToken", data.token);
        console.log("✅ Token tersimpan:", data.token.substring(0, 20) + "...");
      } else {
        console.warn("⚠️ Tidak ada token dari backend, pakai flag login saja.");
      }

      alert("Login berhasil ✅");
      router.push("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
      alert("Login error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          Admin Login
        </h2>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
        )}
      </form>
    </div>
  );
}
