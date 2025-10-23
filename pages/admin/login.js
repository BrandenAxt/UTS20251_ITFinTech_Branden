// pages/admin/login.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function UniversalAuth() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | register
  const [role, setRole] = useState("user"); // user | admin
  const [method, setMethod] = useState("password"); // password | otp
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // admin only
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); // E.164 preferred (+62...)
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        // register user only (admin seeding handled separately)
        const target = role === "admin" ? "/api/admin/register" : "/api/auth/register";
        const payload = role === "admin"
          ? { username, password } // admin registration (if you want)
          : { email, phone, password };
        const { ok, data } = await apiPost(target, payload);
        if (!ok) throw new Error(data.error || "Register failed");
        alert("Register OK, please login");
        setMode("login");
        return;
      }

      // mode === "login"
      if (method === "password") {
        // admin uses admin endpoint; user uses /api/auth/login
        const target = role === "admin" ? "/api/admin/login" : "/api/auth/login";
        const payload = role === "admin" ? { username, password } : { email, password };
        const { ok, data } = await apiPost(target, payload);
        if (!ok) throw new Error(data.error || "Login failed");
        // store token and redirect
        if (data.token) localStorage.setItem(role === "admin" ? "adminToken" : "userToken", data.token);
        localStorage.setItem(role === "admin" ? "adminLoggedIn" : "userLoggedIn", "true");
        alert("Login success");
        router.push(role === "admin" ? "/admin/dashboard" : "/");
        return;
      }

      // method === "otp" flows:
      if (!otp) {
        // send OTP
        const { ok, data } = await apiPost("/api/auth/send-otp", { phone, role });
        if (!ok) throw new Error(data.error || "Send OTP failed");
        alert("OTP sent (check server log / WA mock). Enter OTP and press Login.");
        return;
      } else {
        // verify OTP
        const { ok, data } = await apiPost("/api/auth/verify-otp", { phone, otp, role });
        if (!ok) throw new Error(data.error || "OTP verify failed");
        if (data.token) localStorage.setItem(role === "admin" ? "adminToken" : "userToken", data.token);
        localStorage.setItem(role === "admin" ? "adminLoggedIn" : "userLoggedIn", "true");
        alert("Login via OTP success");
        router.push(role === "admin" ? "/admin/dashboard" : "/");
        return;
      }
    } catch (err) {
      alert("Error: " + (err.message || err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{mode === "register" ? "Register" : "Login"}</h2>
          <div>
            <label className="mr-2 text-sm text-gray-700">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="border px-2 py-1 rounded text-gray-900">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Toggle method */}
          <div className="mb-3">
            <label className="mr-3 text-sm text-gray-700">Method:</label>
            <button type="button" onClick={() => setMethod("password")} className={`px-3 py-1 mr-2 rounded ${method === "password" ? "bg-black text-white": "bg-gray-100 text-gray-900"}`}>Password</button>
            <button type="button" onClick={() => setMethod("otp")} className={`px-3 py-1 rounded ${method === "otp" ? "bg-black text-white": "bg-gray-100 text-gray-900"}`}>WhatsApp OTP</button>
          </div>

          {/* fields */}
          {role === "admin" && method === "password" && (
            <input className="w-full mb-3 px-3 py-2 border rounded text-gray-900" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} />
          )}

          {method === "password" && role === "user" && (
            <input className="w-full mb-3 px-3 py-2 border rounded text-gray-900" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          )}

          {method === "otp" && (
            <input className="w-full mb-3 px-3 py-2 border rounded text-gray-900" placeholder="Phone e.g. +62812..." value={phone} onChange={(e)=>setPhone(e.target.value)} />
          )}

          {method === "password" && (
            <>
              <input type="password" className="w-full mb-3 px-3 py-2 border rounded text-gray-900" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </>
          )}

          {method === "otp" && (
            <>
              <input className="w-full mb-3 px-3 py-2 border rounded text-gray-900" placeholder="OTP code" value={otp} onChange={(e)=>setOtp(e.target.value)} />
            </>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="w-1/2 bg-black text-white py-2 rounded">
              {loading ? "Processing..." : (mode === "register" ? "Register" : (method === "otp" && !otp ? "Send OTP" : "Continue"))}
            </button>

            <button type="button" onClick={()=>setMode(mode==="login"?"register":"login")} className="w-1/2 px-4 py-2 border rounded text-gray-900">
              {mode === "login" ? "Register" : "Back to Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}