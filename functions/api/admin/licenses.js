import {
  PLAN_DAYS,
  PLAN_PRICE_RON,
  creditLicenseFromPayment,
  extendLicenseDays,
  generateVoucherCode,
  handleOptions,
  isAdminAuthorized,
  jsonResponse,
} from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAdminAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  const licenses = await env.DB
    .prepare("SELECT l.*, u.label as user_label FROM licenses l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.last_seen_at DESC LIMIT 100")
    .all();

  const payments = await env.DB
    .prepare("SELECT p.*, l.pairing_code FROM payments p LEFT JOIN licenses l ON l.id = p.license_id ORDER BY p.created_at DESC LIMIT 100")
    .all();

  const codes = await env.DB
    .prepare("SELECT * FROM activation_codes ORDER BY created_at DESC LIMIT 100")
    .all();

  return jsonResponse({
    licenses: licenses.results || [],
    payments: payments.results || [],
    activation_codes: codes.results || [],
    server_time: Date.now(),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAdminAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  try {
    const body = await request.json();
    const action = body.action;
    const now = Date.now();

    if (action === "extend") {
      const licId = String(body.license_id || "");
      const days = Number(body.days || PLAN_DAYS);
      const res = await creditLicenseFromPayment(env.DB, {
        licenseId: licId,
        provider: "admin",
        externalTxId: `ADM:${licId}:${now}`,
        amountRon: PLAN_PRICE_RON,
        currency: "RON",
        amountCharged: `${days}d manual`,
        days,
        note: String(body.note || `Prelungire manuală +${days} zile`),
      });
      return jsonResponse({ ok: true, license: res.license });
    }

    if (action === "approve_payment") {
      const payId = String(body.payment_id || "");
      const days = Number(body.days || PLAN_DAYS);
      const pay = await env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(payId).first();
      if (!pay) return jsonResponse({ error: "Plată negăsită" }, 404);
      if (pay.status === "completed") {
        return jsonResponse({ ok: true, already_completed: true });
      }
      await env.DB.prepare("UPDATE payments SET status = 'completed' WHERE id = ? AND status = 'pending'").bind(payId).run();
      const updated = await extendLicenseDays(env.DB, pay.license_id, days, now);
      return jsonResponse({ ok: true, license: updated });
    }

    if (action === "reject_payment") {
      const payId = String(body.payment_id || "");
      if (!payId) return jsonResponse({ error: "payment_id lipsă" }, 400);
      await env.DB.prepare("DELETE FROM payments WHERE id = ? AND status = 'pending'").bind(payId).run();
      return jsonResponse({ ok: true, deleted: payId });
    }

    if (action === "set_status") {
      const licId = String(body.license_id || "");
      const newStatus = body.status === "banned" ? "banned" : "active";
      await env.DB.prepare("UPDATE licenses SET status = ? WHERE id = ?").bind(newStatus, licId).run();
      return jsonResponse({ ok: true });
    }

    if (action === "generate_codes") {
      const count = Math.min(50, Math.max(1, Number(body.count || 5)));
      const days = Number(body.days || PLAN_DAYS);
      const created = [];
      for (let i = 0; i < count; i++) {
        const code = generateVoucherCode();
        await env.DB
          .prepare("INSERT OR IGNORE INTO activation_codes (code, days, status, created_at) VALUES (?, ?, 'unused', ?)")
          .bind(code, days, now)
          .run();
        created.push(code);
      }
      return jsonResponse({ ok: true, codes: created });
    }

    return jsonResponse({ error: "Acțiune necunoscută" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message || "Admin action error" }, 400);
  }
}
