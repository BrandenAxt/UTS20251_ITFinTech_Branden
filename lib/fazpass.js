// // lib/fazpass.js
// import fetch from "node-fetch";

// const FAZPASS_BASE = process.env.FAZPASS_BASE || "https://api.fazpass.com/v1";
// const FAZPASS_TOKEN = process.env.FAZPASS_TOKEN || ""; // optional
// const FAZPASS_GATEWAY_KEY = process.env.FAZPASS_GATEWAY_KEY || "";

// function normalizePhone(p) {
//   if (!p) return "";
//   let s = String(p).trim().replace(/[^\d+]/g, "");
//   // remove plus for providers that expect digits only (many Fazpass examples use no +)
//   if (s.startsWith("+")) s = s.slice(1);
//   // convert local 0812... to 62812...
//   if (s.startsWith("0")) s = "62" + s.slice(1);
//   return s;
// }

// async function callFazpass(path, body) {
//   const url = `${FAZPASS_BASE}${path.startsWith("/") ? path : "/" + path}`;
//   const res = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(FAZPASS_TOKEN ? { Authorization: `Bearer ${FAZPASS_TOKEN}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });

//   const text = await res.text();
//   try {
//     const json = JSON.parse(text);
//     return { ok: res.ok, status: res.status, data: json, rawText: text };
//   } catch (e) {
//     return { ok: res.ok, status: res.status, data: null, rawText: text };
//   }
// }

// export async function sendOTP(phone) {
//   const destination = normalizePhone(phone);
//   if (!destination) return { ok: false, error: "invalid_phone" };
//   if (!FAZPASS_GATEWAY_KEY) return { ok: false, error: "missing_gateway_key" };

//   const body = {
//     destination, // Fazpass examples often expect digits like 62812...
//     gateway_key: FAZPASS_GATEWAY_KEY,
//     // optional params: params: [{ tag: "brand", value: "testing" }]
//   };

//   try {
//     // try the generate endpoint first (common)
//     const r = await callFazpass("/otp/generate", body);

//     // fallback: some integrations use /otp/send
//     if (!r.ok && (r.status === 404 || r.status === 422)) {
//       const alt = await callFazpass("/otp/send", body);
//       if (alt.ok) return { ok: true, data: alt.data };
//       if (alt.data) return { ok: false, status: alt.status, data: alt.data };
//     }

//     if (!r.ok) {
//       const vendorDown = r.status >= 500 || (r.data && String(r.data?.code || "").startsWith("503"));
//       return { ok: false, status: r.status, data: r.data || r.rawText, vendorDown };
//     }

//     return { ok: true, data: r.data || r.rawText };
//   } catch (err) {
//     console.error("sendOTP error", err);
//     return { ok: false, error: err.message || String(err), vendorDown: true };
//   }
// }

// export async function verifyOTP(phone, otp) {
//   const destination = normalizePhone(phone);
//   if (!destination) return { ok: false, error: "invalid_phone" };
//   if (!FAZPASS_GATEWAY_KEY) return { ok: false, error: "missing_gateway_key" };

//   const body = {
//     destination,
//     gateway_key: FAZPASS_GATEWAY_KEY,
//     otp: String(otp),
//   };

//   try {
//     const r = await callFazpass("/otp/verify", body);
//     if (!r.ok) return { ok: false, status: r.status, data: r.data || r.rawText };

//     const json = r.data;
//     // heuristics for success
//     if (json && (json.status === true || json.ok === true || json.verified === true || json.message?.toLowerCase().includes("success"))) {
//       return { ok: true, data: json };
//     }
//     return { ok: false, data: json || r.rawText };
//   } catch (err) {
//     console.error("verifyOTP error", err);
//     return { ok: false, error: err.message || String(err) };
//   }
// }
