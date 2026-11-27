import {
  DEFAULT_PRICE_EUR,
  PLAN_DAYS,
  PLAN_PRICE_RON,
  computeDaysLeft,
  handleOptions,
  isLicenseActive,
  jsonResponse,
} from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) return jsonResponse({ error: "Cod lipsă" }, 400);

  const lic = await env.DB.prepare("SELECT id, pairing_code, status, expires_at, last_seen_at FROM licenses WHERE pairing_code = ?")
    .bind(code)
    .first();
  if (!lic) {
    return jsonResponse({ error: "Cod TV negăsit. Verifică codul de pe ecranul televizorului." }, 404);
  }

  const now = Date.now();
  const active = isLicenseActive(lic, now);
  return jsonResponse({
    pairing_code: lic.pairing_code,
    licensed: active,
    status: lic.status,
    expires_at: Number(lic.expires_at),
    days_left: computeDaysLeft(lic.expires_at, now),
    price_ron: PLAN_PRICE_RON,
    price_eur: env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR,
    paypal_currency: env.PAYPAL_CURRENCY || "EUR",
    plan_days: PLAN_DAYS,
    paypal_enabled: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
    paypal_me_handle: env.PAYPAL_ME_HANDLE || "",
    revolut_handle: env.REVOLUT_HANDLE || "",
  });
}
