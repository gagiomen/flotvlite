import {
  PLAN_PRICE_RON,
  computeDaysLeft,
  creditLicenseFromPayment,
  getOrCreateLicense,
  handleOptions,
  isLicenseActive,
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
    const deviceId = String(body.device_id || "").trim();
    const pairingCode = String(body.pairing_code || "").trim().toUpperCase();
    const voucherCode = String(body.code || "").trim().toUpperCase();

    if (!voucherCode || voucherCode.length < 4) {
      return jsonResponse({ error: "Cod de activare invalid" }, 400);
    }

    let lic = null;
    if (deviceId.length >= 8) {
      lic = await getOrCreateLicense(env.DB, deviceId);
    } else if (pairingCode) {
      lic = await env.DB.prepare("SELECT * FROM licenses WHERE pairing_code = ?").bind(pairingCode).first();
    }
    if (!lic) {
      return jsonResponse({ error: "Dispozitiv / cod TV negăsit" }, 404);
    }

    const voucher = await env.DB.prepare("SELECT * FROM activation_codes WHERE code = ?").bind(voucherCode).first();
    if (!voucher) {
      return jsonResponse({ error: "Cod de activare inexistent" }, 404);
    }
    if (voucher.status !== "unused") {
      return jsonResponse({ error: "Acest cod de activare a fost deja folosit" }, 409);
    }

    const now = Date.now();
    // Atomic claim to prevent double redemption
    const claimRes = await env.DB
      .prepare("UPDATE activation_codes SET status = 'used', used_by_license_id = ?, used_at = ? WHERE code = ? AND status = 'unused'")
      .bind(lic.id, now, voucherCode)
      .run();

    if (!claimRes.meta || claimRes.meta.changes === 0) {
      return jsonResponse({ error: "Codul a fost deja revendicat" }, 409);
    }

    const res = await creditLicenseFromPayment(env.DB, {
      licenseId: lic.id,
      provider: "voucher",
      externalTxId: `VOUCHER:${voucherCode}`,
      amountRon: PLAN_PRICE_RON,
      currency: "RON",
      amountCharged: `${PLAN_PRICE_RON} RON`,
      days: Number(voucher.days || 30),
      note: `Activare prin cod ${voucherCode}`,
    });

    const active = isLicenseActive(res.license, now);
    return jsonResponse({
      ok: true,
      licensed: active,
      days_added: Number(voucher.days || 30),
      expires_at: Number(res.license.expires_at),
      days_left: computeDaysLeft(res.license.expires_at, now),
    });
  } catch (err) {
    return jsonResponse({ error: err.message || "Redeem failed" }, 400);
  }
}
