import { corsHeaders, handleOptions, jsonResponse, verifySessionToken } from "../_shared.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse({ error: "D1 database missing" }, 500);

  const url = new URL(request.url);
  const st = (url.searchParams.get("st") || "").trim();
  const secret = env.SESSION_SECRET || env.ADMIN_SECRET || "";
  const verified = await verifySessionToken(secret, st);
  if (!verified) {
    return jsonResponse({ error: "Sesiune expirată sau invalidă" }, 403);
  }

  const rows = await env.DB
    .prepare("SELECT id, payload_json FROM stream_catalog WHERE id IN ('vod_cinepub', 'vod_cartoonix_0', 'vod_cartoonix_1')")
    .all();

  let cinepub = { categories: [], movies: [] };
  let c0 = [];
  let c1 = [];
  for (const r of rows.results || []) {
    try {
      const parsed = JSON.parse(r.payload_json);
      if (r.id === "vod_cinepub") cinepub = parsed;
      else if (r.id === "vod_cartoonix_0") c0 = parsed;
      else if (r.id === "vod_cartoonix_1") c1 = parsed;
    } catch {}
  }

  return new Response(JSON.stringify({ cartoonix: [...c0, ...c1], cinepub }), {
    status: 200,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    }),
  });
}
