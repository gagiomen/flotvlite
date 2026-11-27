import {
  DEFAULT_PRICE_EUR,
  PLAN_DAYS,
  PLAN_PRICE_RON,
  computeDaysLeft,
  getOrCreateLicense,
  handleOptions,
  isLicenseActive,
  jsonResponse,
  signSessionToken,
} from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) {
    return jsonResponse({ error: "D1 database binding (DB) missing" }, 500);
  }

  try {
    const body = await request.json();
    const deviceId = body.device_id;
    const deviceLabel = body.device_label || "Philips Android TV";
    const lic = await getOrCreateLicense(env.DB, deviceId, deviceLabel);
    const now = Date.now();
    const active = isLicenseActive(lic, now);
    const daysLeft = computeDaysLeft(lic.expires_at, now);

    const origin = new URL(request.url).origin;
    const payUrl = `${origin}/pay.html?code=${encodeURIComponent(lic.pairing_code)}`;

    if (!active) {
      return jsonResponse({
        licensed: false,
        locked: true,
        status: lic.status === "banned" ? "banned" : "expired",
        pairing_code: lic.pairing_code,
        expires_at: Number(lic.expires_at),
        days_left: 0,
        server_time: now,
        price_ron: PLAN_PRICE_RON,
        price_eur: env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR,
        plan_days: PLAN_DAYS,
        pay_url: payUrl,
        channels: [],
      });
    }

    // Active / Trial -> load protected stream catalog from D1 into RAM response
    const row = await env.DB.prepare("SELECT payload_json, version FROM stream_catalog WHERE id = 'main'").first();
    let channels = [];
    let catalogVersion = 0;
    if (row && row.payload_json) {
      try {
        channels = JSON.parse(row.payload_json);
        catalogVersion = Number(row.version || 1);
      } catch {
        channels = [];
      }
    }

    const sessionToken = await signSessionToken(env.SESSION_SECRET || env.ADMIN_SECRET || "", lic.id, lic.expires_at);

    return jsonResponse({
      licensed: true,
      locked: false,
      status: lic.status,
      pairing_code: lic.pairing_code,
      expires_at: Number(lic.expires_at),
      days_left: daysLeft,
      server_time: now,
      price_ron: PLAN_PRICE_RON,
      price_eur: env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR,
      plan_days: PLAN_DAYS,
      pay_url: payUrl,
      catalog_version: catalogVersion,
      session_token: sessionToken,
      channels,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || "Bootstrap error" }, 400);
  }
}
