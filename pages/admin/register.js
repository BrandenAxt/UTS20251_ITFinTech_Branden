// pages/admin/register.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminRegister() {
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    const res = await fetch("/api/admin/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    const data = await res.json();
    if(!res.ok) return alert(data.error||"Error");
    alert("Admin created");
    router.push("/admin/login");
  }

  return (
    <form onSubmit={submit} style={{maxWidth:420, margin:40,padding:20,background:"#fff"}}>
      <h2>Admin Register</h2>
      <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
      <button type="submit">Register</button>
    </form>
  );
}
