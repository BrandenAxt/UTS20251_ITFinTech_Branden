// lib/wa.js
import fetch from "node-fetch";

const PROVIDER = process.env.WA_PROVIDER || "meta"; // default meta
const META_TOKEN = process.env.WA_META_ACCESS_TOKEN;
const META_PHONE_ID = process.env.WA_META_PHONE_NUMBER_ID;

export async function sendWhatsApp(toPhone, payload = {}) {
  // toPhone: expected e.g. "+62812...."
  if (!toPhone) return { ok: false, reason: "missing_to" };

  if (PROVIDER === "mock") {
    console.log("[MOCK WA] to=", toPhone, "payload=", payload);
    return { ok: true, provider: "mock" };
  }

  if (PROVIDER === "meta") {
    if (!META_TOKEN || !META_PHONE_ID) {
      return { ok: false, reason: "missing_meta_env" };
    }

    const url = `https://graph.facebook.com/v17.0/${META_PHONE_ID}/messages`;
    const headers = {
      Authorization: `Bearer ${META_TOKEN}`,
      "Content-Type": "application/json",
    };

    // Build request body: either template or text
    let body;
    if (payload.template) {
      body = {
        messaging_product: "whatsapp",
        to: toPhone.replace(/^\+/, ""),
        type: "template",
        template: payload.template,
      };
    } else if (payload.text) {
      body = {
        messaging_product: "whatsapp",
        to: toPhone.replace(/^\+/, ""),
        type: "text",
        text: { body: payload.text },
      };
    } else {
      return { ok: false, reason: "invalid_payload" };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("WA Meta error", res.status, json);
        return { ok: false, provider: "meta", status: res.status, payload: json };
      }
      return { ok: true, provider: "meta", payload: json };
    } catch (err) {
      console.error("WA Meta request failed", err);
      return { ok: false, reason: "request_error", detail: String(err) };
    }
  }

  return { ok: false, reason: "unsupported_provider" };
}
