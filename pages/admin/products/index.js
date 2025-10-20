// pages/admin/products/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ProductsAdmin(){
  const [products,setProducts]=useState([]);
  const router = useRouter();
  useEffect(()=>{
    const token = localStorage.getItem("adminToken");
    if(!token) router.push("/admin/login");
    fetch("/api/admin/products", { headers: { Authorization: "Bearer "+token }})
      .then(r=>r.json()).then(setProducts).catch(console.error);
  },[]);
  async function del(id){
    if(!confirm("Delete product?")) return;
    const token = localStorage.getItem("adminToken");
    await fetch("/api/admin/products/"+id, { method:"DELETE", headers:{ Authorization:"Bearer "+token }});
    setProducts(products.filter(p=>p._id !== id));
  }
  return (
    <div style={{padding:20}}>
      <h2>Products</h2>
      <button onClick={()=>router.push("/admin/products/new")}>New Product</button>
      <table border="1" cellPadding="8" style={{marginTop:12,width:"100%"}}>
        <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          {products.map(p=>(
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.price?.toLocaleString()}</td>
              <td>{p.stock}</td>
              <td>
                <button onClick={()=>router.push("/admin/products/"+p._id+"/edit")}>Edit</button>
                <button onClick={()=>del(p._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
