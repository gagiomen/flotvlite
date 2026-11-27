import {
  DEFAULT_PRICE_EUR,
  PLAN_DAYS,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  handleOptions,
  jsonResponse,
} from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  try {
    const body = await request.json();
    const pairingCode = String(body.pairing_code || "").trim().toUpperCase();
    if (!pairingCode) return jsonResponse({ error: "pairing_code lipsă" }, 400);

    const lic = await env.DB.prepare("SELECT * FROM licenses WHERE pairing_code = ?").bind(pairingCode).first();
    if (!lic) return jsonResponse({ error: "Dispozitiv negăsit" }, 404);

    const token = await getPayPalAccessToken(env);
    const base = getPayPalBaseUrl(env);
    const currency = env.PAYPAL_CURRENCY || "EUR";
    const value = env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR;
    const origin = new URL(request.url).origin;

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: lic.pairing_code,
            custom_id: lic.id,
            description: `Flo Lite TV Player - Licență ${PLAN_DAYS} zile (${lic.pairing_code})`,
            amount: {
              currency_code: currency,
              value: String(value),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Flo Lite TV",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: `${origin}/pay.html?code=${encodeURIComponent(lic.pairing_code)}&pp=return`,
              cancel_url: `${origin}/pay.html?code=${encodeURIComponent(lic.pairing_code)}&pp=cancel`,
            },
          },
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return jsonResponse({ error: orderData.message || "PayPal create order failed", details: orderData }, 502);
    }

    const approveLink = (orderData.links || []).find((l) => l.rel === "payer-action" || l.rel === "approve");
    return jsonResponse({
      order_id: orderData.id,
      approve_url: approveLink ? approveLink.href : null,
      status: orderData.status,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || "PayPal error" }, 500);
  }
}
