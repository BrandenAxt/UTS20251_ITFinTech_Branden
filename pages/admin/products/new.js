// pages/admin/products/new.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function NewProduct(){
  const [name,setName]=useState("");
  const [price,setPrice]=useState("");
  const [stock,setStock]=useState(0);
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    const res = await fetch("/api/admin/products", {
      method:"POST",
      headers: { "Content-Type":"application/json", Authorization:"Bearer "+token },
      body: JSON.stringify({ name, price: Number(price), stock: Number(stock) })
    });
    if (!res.ok) { alert("Error"); return; }
    router.push("/admin/products");
  }

  return (
    <div style={{padding:20}}>
      <h3>New Product</h3>
      <form onSubmit={submit}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /><br/>
        <input placeholder="Price" value={price} onChange={e=>setPrice(e.target.value)} /><br/>
        <input placeholder="Stock" value={stock} onChange={e=>setStock(e.target.value)} /><br/>
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
