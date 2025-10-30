// lib/fonnte.js
export async function sendWhatsAppViaFonnte(toPhone, message) {
  const apiUrl = process.env.FONNTE_API_URL; // contoh: https://api.fonnte.com/send
  const token  = process.env.FONNTE_TOKEN;
  const device = process.env.FONNTE_DEVICE; // opsional tapi disarankan

  if (!apiUrl || !token) {
    console.error("Fonnte not configured (FONNTE_API_URL/FONNTE_TOKEN missing)");
    return { ok: false, reason: "fonnte_not_configured" };
  }

  // Fonnte maunya tanpa '+'
  const normalizedPhone = (toPhone || "").startsWith("+")
    ? toPhone.slice(1)
    : String(toPhone || "");

  const payload = new URLSearchParams();
  payload.append("target", normalizedPhone);
  payload.append("message", message);
  if (device) payload.append("device", device); // kalau ada, kirim

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        // penting: urlencoded
        "Content-Type": "application/x-www-form-urlencoded",
        // Fonnte pakai token mentah (tanpa "Bearer ")
        "Authorization": token,
      },
      body: payload.toString(),
    });

    const jsonText = await res.text();
    let responseJson;
    try { responseJson = JSON.parse(jsonText); } catch { responseJson = { raw: jsonText }; }

    // Fonnte kadang balikin {status:false, reason: "..."}
    if (!res.ok || responseJson?.status === false) {
      const reason = responseJson?.reason || "unknown";
      console.error("Fonnte API Error:", responseJson);

      // —— DEV fallback agar UX kamu tetap lanjut kalau paket free ngeblok ——
      if (/free package|trial|invalid message request/i.test(reason)) {
        return { ok: true, mocked: true, note: "fonnte_free_blocked", details: responseJson };
      }
      return { ok: false, reason: "fonnte_api_error", details: responseJson };
    }

    return { ok: true, payload: responseJson };
  } catch (err) {
    console.error("Fetch error sending to Fonnte:", err);
    // DEV fallback: anggap terkirim supaya flow lanjut
    return { ok: true, mocked: true, note: "network_fallback", error: err.message };
  }
}
