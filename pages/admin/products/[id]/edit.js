// pages/admin/products/[id]/edit.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function EditProduct(){
  const router = useRouter();
  const { id } = router.query;
  const [product,setProduct] = useState(null);
  const [name,setName]=useState("");
  const [price,setPrice]=useState("");
  const [stock,setStock]=useState(0);

  useEffect(()=>{
    if(!id) return;
    const token = localStorage.getItem("adminToken");
    fetch("/api/admin/products/"+id, { headers:{ Authorization: "Bearer "+token }})
      .then(r=>r.json()).then(p=>{ setProduct(p); setName(p.name); setPrice(String(p.price)); setStock(p.stock||0); });
  },[id]);

  async function submit(e){
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    const res = await fetch("/api/admin/products/"+id, {
      method:"PUT",
      headers: { "Content-Type":"application/json", Authorization:"Bearer "+token },
      body: JSON.stringify({ name, price: Number(price), stock: Number(stock) })
    });
    if(!res.ok) { alert("Error"); return; }
    router.push("/admin/products");
  }

  if(!product) return <div>Loading...</div>;
  return (
    <div style={{padding:20}}>
      <h3>Edit Product</h3>
      <form onSubmit={submit}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} /><br/>
        <input placeholder="Price" value={price} onChange={e=>setPrice(e.target.value)} /><br/>
        <input placeholder="Stock" value={stock} onChange={e=>setStock(e.target.value)} /><br/>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
