import {
  PLAN_DAYS,
  PLAN_PRICE_RON,
  creditLicenseFromPayment,
  jsonResponse,
  verifyPayPalWebhook,
} from "../_shared.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  let eventObj;
  try {
    eventObj = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const verified = await verifyPayPalWebhook(env, request, eventObj);
  if (!verified) {
    return jsonResponse({ error: "Invalid PayPal webhook signature" }, 401);
  }

  const eventType = eventObj.event_type || "";
  if (eventType !== "PAYMENT.CAPTURE.COMPLETED" && eventType !== "CHECKOUT.ORDER.COMPLETED") {
    return jsonResponse({ received: true, ignored: eventType });
  }

  const resource = eventObj.resource || {};
  let licenseId = resource.custom_id || "";
  let txId = resource.id || eventObj.id;
  let cur = "EUR";
  let amt = "";

  if (resource.amount && resource.amount.value) {
    cur = resource.amount.currency_code || "EUR";
    amt = `${resource.amount.value} ${cur}`;
  }

  if (!licenseId && Array.isArray(resource.purchase_units) && resource.purchase_units[0]) {
    const u = resource.purchase_units[0];
    licenseId = u.custom_id || "";
    const cap = u.payments && u.payments.captures && u.payments.captures[0];
    if (cap) {
      txId = cap.id || txId;
      licenseId = licenseId || cap.custom_id || "";
      if (cap.amount) {
        cur = cap.amount.currency_code || cur;
        amt = `${cap.amount.value} ${cur}`;
      }
    }
  }

  if (!licenseId) {
    return jsonResponse({ error: "Missing license custom_id in webhook" }, 400);
  }

  const res = await creditLicenseFromPayment(env.DB, {
    licenseId,
    provider: "paypal",
    externalTxId: `PP:${txId}`,
    amountRon: PLAN_PRICE_RON,
    currency: cur,
    amountCharged: amt,
    days: PLAN_DAYS,
    note: `Webhook ${eventType} (${txId})`,
  });

  return jsonResponse({
    ok: true,
    already_credited: res.alreadyCredited,
    license_id: licenseId,
  });
}
