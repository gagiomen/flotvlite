import { DEFAULT_PRICE_EUR, PLAN_PRICE_RON, handleOptions, jsonResponse, randomId } from "../_shared.js";

const PROVIDERS = {
  revolut: { prefix: "rev", label: "Revolut", currency: "RON", charged: "6 RON" },
  paypal_me: { prefix: "ppm", label: "PayPal.me", currency: "EUR", charged: null },
};

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  try {
    const body = await request.json();
    const pairingCode = String(body.pairing_code || "").trim().toUpperCase();
    const senderName = String(body.sender_name || "").trim().slice(0, 60);
    const provider = PROVIDERS[body.provider] ? body.provider : "revolut";
    const cfg = PROVIDERS[provider];
    if (!pairingCode) return jsonResponse({ error: "pairing_code lipsă" }, 400);

    const lic = await env.DB.prepare("SELECT id, pairing_code FROM licenses WHERE pairing_code = ?").bind(pairingCode).first();
    if (!lic) return jsonResponse({ error: "Cod TV negăsit" }, 404);

    const now = Date.now();
    // Avoid duplicate pending spam from same device & provider in last 5 mins
    const recent = await env.DB
      .prepare("SELECT id FROM payments WHERE license_id = ? AND provider = ? AND status = 'pending' AND created_at > ?")
      .bind(lic.id, provider, now - 5 * 60 * 1000)
      .first();

    if (recent) {
      return jsonResponse({ ok: true, payment_id: recent.id, already_reported: true });
    }

    const payId = randomId(cfg.prefix);
    const amountEur = `${env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR} ${env.PAYPAL_CURRENCY || "EUR"}`;
    const charged = cfg.charged || amountEur;
    const note = `${cfg.label} ${pairingCode}` + (senderName ? ` (${senderName})` : "");
    await env.DB
      .prepare(
        "INSERT INTO payments (id, license_id, provider, external_tx_id, amount_ron, currency, amount_charged, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
      )
      .bind(payId, lic.id, provider, `${cfg.prefix.toUpperCase()}:${payId}`, PLAN_PRICE_RON, cfg.currency, charged, note, now)
      .run();

    return jsonResponse({ ok: true, payment_id: payId, provider, status: "pending" });
  } catch (err) {
    return jsonResponse({ error: err.message || "Error" }, 400);
  }
}
