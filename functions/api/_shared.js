// Shared utilities for Flo Lite TV v5.0 Cloudflare Pages Functions + D1

export const TRIAL_DAYS = 7;
export const PLAN_DAYS = 30;
export const PLAN_PRICE_RON = 6;
export const DEFAULT_PRICE_EUR = "1.20";
export const DAY_MS = 86400000;

export function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "https://flotvlite.pages.dev",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    ...extra,
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
  });
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function randomId(prefix = "") {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return prefix ? `${prefix}_${hex}` : hex;
}

export function generateShortCode(prefix = "FL-") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let out = prefix;
  for (let i = 0; i < 4; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateVoucherCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let p1 = "", p2 = "";
  for (let i = 0; i < 4; i++) p1 += alphabet[bytes[i] % alphabet.length];
  for (let i = 4; i < 8; i++) p2 += alphabet[bytes[i] % alphabet.length];
  return `FLO5-${p1}-${p2}`;
}

export function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isAdminAuthorized(request, env) {
  const secret = env.ADMIN_SECRET;
  if (!secret || secret.length < 8) return false;
  const auth = request.headers.get("Authorization") || "";
  const headerKey = request.headers.get("X-Admin-Key") || "";
  const candidate = auth.startsWith("Bearer ") ? auth.slice(7).trim() : headerKey.trim();
  return constantTimeEqual(candidate, secret);
}

export async function getOrCreateLicense(db, deviceId, deviceLabel = "Philips Android TV") {
  const cleanId = String(deviceId || "").trim().slice(0, 128);
  if (cleanId.length < 8) {
    throw new Error("device_id invalid");
  }
  const now = Date.now();
  let lic = await db.prepare("SELECT * FROM licenses WHERE device_id = ?").bind(cleanId).first();
  if (lic) {
    await db.prepare("UPDATE licenses SET last_seen_at = ? WHERE id = ?").bind(now, lic.id).run();
    return lic;
  }

  // First boot -> grant 7-day free trial tied permanently to device_id
  const userId = randomId("usr");
  const licId = randomId("lic");
  const expiresAt = now + TRIAL_DAYS * DAY_MS;

  let pairingCode = generateShortCode("FL-");
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await db.prepare("SELECT id FROM licenses WHERE pairing_code = ?").bind(pairingCode).first();
    if (!exists) break;
    pairingCode = generateShortCode("FL-");
  }

  await db
    .prepare("INSERT INTO users (id, label, role, created_at) VALUES (?, ?, 'customer', ?)")
    .bind(userId, String(deviceLabel || "Android TV").slice(0, 80), now)
    .run();

  await db
    .prepare(
      "INSERT INTO licenses (id, user_id, device_id, pairing_code, status, trial_used, plan_days, expires_at, last_seen_at, created_at) VALUES (?, ?, ?, ?, 'trial', 1, ?, ?, ?, ?)"
    )
    .bind(licId, userId, cleanId, pairingCode, TRIAL_DAYS, expiresAt, now, now)
    .run();

  return await db.prepare("SELECT * FROM licenses WHERE id = ?").bind(licId).first();
}

export function isLicenseActive(lic, now = Date.now()) {
  if (!lic) return false;
  if (lic.status === "banned" || lic.status === "suspended") return false;
  return Number(lic.expires_at) >= now;
}

export function computeDaysLeft(expiresAt, now = Date.now()) {
  const diff = Number(expiresAt) - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

export async function extendLicenseDays(db, licenseId, days, now = Date.now()) {
  const lic = await db.prepare("SELECT * FROM licenses WHERE id = ?").bind(licenseId).first();
  if (!lic) throw new Error("License not found");
  const base = Math.max(now, Number(lic.expires_at) || 0);
  const newExpires = base + Number(days) * DAY_MS;
  await db
    .prepare("UPDATE licenses SET expires_at = ?, status = 'active', plan_days = ?, last_seen_at = ? WHERE id = ?")
    .bind(newExpires, Number(days), now, licenseId)
    .run();
  return await db.prepare("SELECT * FROM licenses WHERE id = ?").bind(licenseId).first();
}

export async function creditLicenseFromPayment(
  db,
  { licenseId, provider, externalTxId, amountRon, currency, amountCharged, days = PLAN_DAYS, note = "" }
) {
  const now = Date.now();
  if (externalTxId) {
    const existing = await db.prepare("SELECT id, status FROM payments WHERE external_tx_id = ?").bind(externalTxId).first();
    if (existing && existing.status === "completed") {
      const lic = await db.prepare("SELECT * FROM licenses WHERE id = ?").bind(licenseId).first();
      return { alreadyCredited: true, license: lic };
    }
  }

  const payId = randomId("pay");
  await db
    .prepare(
      "INSERT INTO payments (id, license_id, provider, external_tx_id, amount_ron, currency, amount_charged, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)"
    )
    .bind(payId, licenseId, provider, externalTxId || payId, amountRon, currency, String(amountCharged || ""), note, now)
    .run();

  const updated = await extendLicenseDays(db, licenseId, days, now);
  return { alreadyCredited: false, license: updated, paymentId: payId };
}

export function getPayPalBaseUrl(env) {
  return String(env.PAYPAL_MODE || "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export async function getPayPalAccessToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }
  const base = getPayPalBaseUrl(env);
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${errTxt}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function verifyPayPalWebhook(env, request, eventObj) {
  if (!env.PAYPAL_WEBHOOK_ID) {
    return false;
  }
  const token = await getPayPalAccessToken(env);
  const base = getPayPalBaseUrl(env);
  const verifyPayload = {
    auth_algo: request.headers.get("PAYPAL-AUTH-ALGO") || "",
    cert_url: request.headers.get("PAYPAL-CERT-URL") || "",
    transmission_id: request.headers.get("PAYPAL-TRANSMISSION-ID") || "",
    transmission_sig: request.headers.get("PAYPAL-TRANSMISSION-SIG") || "",
    transmission_time: request.headers.get("PAYPAL-TRANSMISSION-TIME") || "",
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: eventObj,
  };
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(verifyPayload),
  });
  if (!res.ok) return false;
  const result = await res.json();
  return result.verification_status === "SUCCESS";
}

export async function signSessionToken(secret, licenseId, expiresAt) {
  if (!secret) return "";
  const msg = `${licenseId}.${expiresAt}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${msg}.${b64}`;
}
