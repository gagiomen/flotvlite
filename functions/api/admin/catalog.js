import { handleOptions, isAdminAuthorized, jsonResponse } from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAdminAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  const row = await env.DB.prepare("SELECT payload_json, version, updated_at FROM stream_catalog WHERE id = 'main'").first();
  if (!row) return jsonResponse({ version: 0, count: 0, updated_at: null });
  let count = 0;
  try {
    count = JSON.parse(row.payload_json).length;
  } catch {
    count = 0;
  }
  return jsonResponse({ version: row.version, count, updated_at: row.updated_at });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAdminAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  try {
    const body = await request.json();
    const ALLOWED_IDS = new Set(["main", "vod_cinepub", "vod_cartoonix_0", "vod_cartoonix_1"]);
    const catalogId = ALLOWED_IDS.has(body.catalog_id) ? body.catalog_id : "main";
    const payload = catalogId === "main" ? body.channels : body.payload;

    if (catalogId === "main" && (!Array.isArray(payload) || payload.length === 0)) {
      return jsonResponse({ error: "channels[] array required" }, 400);
    }
    if (catalogId !== "main" && !payload) {
      return jsonResponse({ error: "payload required" }, 400);
    }

    const existing = await env.DB.prepare("SELECT version FROM stream_catalog WHERE id = ?").bind(catalogId).first();
    const nextVersion = existing ? Number(existing.version || 1) + 1 : 1;
    const now = Date.now();
    const payloadStr = JSON.stringify(payload);

    await env.DB
      .prepare(
        "INSERT INTO stream_catalog (id, payload_json, version, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, version = excluded.version, updated_at = excluded.updated_at"
      )
      .bind(catalogId, payloadStr, nextVersion, now)
      .run();

    const count = Array.isArray(payload) ? payload.length : (Array.isArray(payload.movies) ? payload.movies.length : 1);
    return jsonResponse({ ok: true, catalog_id: catalogId, count, version: nextVersion, updated_at: now });
  } catch (err) {
    return jsonResponse({ error: err.message || "Catalog upload error" }, 400);
  }
}
