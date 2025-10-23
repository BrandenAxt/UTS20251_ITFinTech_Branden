// pages/auth/login.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function UserLogin(){
  const [identifier,setIdentifier]=useState("");
  const [password,setPassword]=useState("");
  const [otpCode,setOtpCode]=useState("");
  const [phase,setPhase]=useState("choose"); // choose | password | otp | verify
  const router = useRouter();

  async function loginWithPassword(e){
    e?.preventDefault();
    const res = await fetch("/api/auth/login-password", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error||"Login failed");
    if (data.token) localStorage.setItem("userToken", data.token);
    router.push("/");
  }

  async function sendOtp(){
    const res = await fetch("/api/auth/send-otp", { method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phone: identifier })});
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Send OTP failed");
    alert("OTP dikirim (cek server console jika pakai mock).");
    setPhase("verify");
  }

  async function verifyOtp(e){
    e?.preventDefault();
    const res = await fetch("/api/auth/verify-otp", { method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ phone: identifier, code: otpCode })});
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Verify failed");
    if (data.token) localStorage.setItem("userToken", data.token);
    router.push("/");
  }

  return (
    <div style={{maxWidth:420, margin:40, padding:20, background:"#fff"}}>
      <h2>User Login</h2>

      {phase === "choose" && (
        <>
          <input placeholder="Email or phone" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          <div style={{display:"flex", gap:6, marginTop:8}}>
            <button onClick={()=>setPhase("password")}>Login with Password</button>
            <button onClick={()=>setPhase("otp")}>Login with OTP</button>
          </div>
        </>
      )}

      {phase === "password" && (
        <form onSubmit={loginWithPassword}>
          <input placeholder="Email or phone" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button type="submit">Login</button>
          <button type="button" onClick={()=>setPhase("choose")}>Back</button>
        </form>
      )}

      {phase === "otp" && (
        <>
          <input placeholder="Phone (E.164) e.g. +62812..." value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          <div style={{display:"flex", gap:6, marginTop:8}}>
            <button onClick={sendOtp}>Send OTP</button>
            <button onClick={()=>setPhase("choose")}>Back</button>
          </div>
        </>
      )}

      {phase === "verify" && (
        <form onSubmit={verifyOtp}>
          <input placeholder="Phone" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          <input placeholder="OTP code" value={otpCode} onChange={e=>setOtpCode(e.target.value)} />
          <button type="submit">Verify & Login</button>
        </form>
      )}
    </div>
  );
}
