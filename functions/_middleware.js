const BLOCKED_EXACT = new Set([
  "/channels.json",
  "/cartoonix_catalog.json",
  "/cinepub_catalog.json",
  "/app.js",
  "/style.css",
  "/proxy",
]);

const BLOCKED_ADULT_RE = /^\/logos\/(adult_|hustler|passion|playboy|private|redlight|leo_tv)/i;

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (BLOCKED_EXACT.has(pathname) || BLOCKED_ADULT_RE.test(pathname)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  return context.next();
}
