// pages/auth/register.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function UserRegister(){
  const [name,setName]=useState("");
  const [identifier,setIdentifier]=useState(""); // email or phone
  const [password,setPassword]=useState("");
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    const [email, phone] = identifier.includes("@") ? [identifier, undefined] : [undefined, identifier];
    const res = await fetch("/api/auth/register", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Register failed");
    alert("Register sukses. Silakan login.");
    router.push("/auth/login");
  }

  return (
    <form onSubmit={submit} style={{maxWidth:420, margin:40, padding:20, background:"#fff"}}>
      <h2>User Register</h2>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" />
      <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Email or phone (phone like +6281...)" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" />
      <button type="submit">Register</button>
    </form>
  );
}
