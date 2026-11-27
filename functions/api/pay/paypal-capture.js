import {
  PLAN_DAYS,
  PLAN_PRICE_RON,
  computeDaysLeft,
  creditLicenseFromPayment,
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
    const orderId = String(body.order_id || "").trim();
    if (!orderId) return jsonResponse({ error: "order_id lipsă" }, 400);

    const token = await getPayPalAccessToken(env);
    const base = getPayPalBaseUrl(env);

    const capRes = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const capData = await capRes.json();
    if (!capRes.ok) {
      return jsonResponse({ error: capData.message || "Capture failed", details: capData }, 502);
    }

    if (capData.status !== "COMPLETED") {
      return jsonResponse({ error: `PayPal status: ${capData.status}` }, 400);
    }

    const unit = (capData.purchase_units && capData.purchase_units[0]) || {};
    const capture = unit.payments && unit.payments.captures && unit.payments.captures[0];
    const licenseId = unit.custom_id || (capture && capture.custom_id);
    if (!licenseId) {
      return jsonResponse({ error: "custom_id (license_id) missing in PayPal response" }, 400);
    }

    const txId = (capture && capture.id) || capData.id;
    const amt = capture && capture.amount ? `${capture.amount.value} ${capture.amount.currency_code}` : "";
    const cur = (capture && capture.amount && capture.amount.currency_code) || "EUR";

    const res = await creditLicenseFromPayment(env.DB, {
      licenseId,
      provider: "paypal",
      externalTxId: `PP:${txId}`,
      amountRon: PLAN_PRICE_RON,
      currency: cur,
      amountCharged: amt,
      days: PLAN_DAYS,
      note: `PayPal Capture ${txId}`,
    });

    const now = Date.now();
    return jsonResponse({
      ok: true,
      already_credited: res.alreadyCredited,
      expires_at: Number(res.license.expires_at),
      days_left: computeDaysLeft(res.license.expires_at, now),
    });
  } catch (err) {
    return jsonResponse({ error: err.message || "Capture error" }, 500);
  }
}
