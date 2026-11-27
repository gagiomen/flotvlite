import {
  DEFAULT_PRICE_EUR,
  PLAN_DAYS,
  PLAN_PRICE_RON,
  computeDaysLeft,
  getOrCreateLicense,
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
  const deviceId = url.searchParams.get("device_id") || "";
  if (deviceId.length < 8) return jsonResponse({ error: "device_id invalid" }, 400);

  const lic = await getOrCreateLicense(env.DB, deviceId);
  const now = Date.now();
  const active = isLicenseActive(lic, now);
  return jsonResponse({
    licensed: active,
    locked: !active,
    status: lic.status === "banned" ? "banned" : active ? lic.status : "expired",
    pairing_code: lic.pairing_code,
    expires_at: Number(lic.expires_at),
    days_left: computeDaysLeft(lic.expires_at, now),
    server_time: now,
    price_ron: PLAN_PRICE_RON,
    price_eur: env.PAYPAL_PRICE_EUR || DEFAULT_PRICE_EUR,
    plan_days: PLAN_DAYS,
    pay_url: `${url.origin}/pay.html?code=${encodeURIComponent(lic.pairing_code)}`,
  });
}
