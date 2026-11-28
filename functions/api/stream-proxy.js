import { isSafeExternalMediaUrl, verifySessionToken } from "./_shared.js";

function proxyHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "https://flotvlite.pages.dev",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: proxyHeaders() });
  }

  const sessionToken = (url.searchParams.get("st") || "").trim();
  const secret = env.SESSION_SECRET || env.ADMIN_SECRET || "";
  const verified = await verifySessionToken(secret, sessionToken);
  if (!verified) {
    return new Response("Forbidden: active license session required", {
      status: 403,
      headers: proxyHeaders({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }),
    });
  }

  const targetUrl = url.searchParams.get("url") || "";
  const referer = url.searchParams.get("ref") || "";
  if (!targetUrl || !isSafeExternalMediaUrl(targetUrl)) {
    return new Response("Invalid or blocked stream target", {
      status: 400,
      headers: proxyHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }

  try {
    let effectiveUrl = targetUrl;
    if (effectiveUrl.includes("radiozu.ro/live")) {
      const pageRes = await fetch("https://radiozu.ro/live", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });
      const html = await pageRes.text();
      const match = html.match(/https:\/\/ivm\.antenaplay\.ro\/live\/zurtv\/playlist\.m3u8[^"'\s<>]+/);
      if (match) {
        effectiveUrl = match[0].replace(/&amp;/g, "&");
      }
    }

    const parsedTarget = new URL(effectiveUrl);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsedTarget.hostname)) {
      const sslipHost = parsedTarget.hostname.replace(/\./g, "-") + ".sslip.io";
      effectiveUrl = `${parsedTarget.protocol}//${sslipHost}${parsedTarget.port ? ":" + parsedTarget.port : ""}${parsedTarget.pathname}${parsedTarget.search}`;
    }

    const isAudioLike =
      !effectiveUrl.includes(".m3u8") &&
      (effectiveUrl.includes(".mp3") || effectiveUrl.includes(".aac") || effectiveUrl.includes("listen") || /:\d{4}/.test(effectiveUrl));

    const upstreamHeaders = new Headers();
    upstreamHeaders.set(
      "User-Agent",
      isAudioLike
        ? "VLC/3.0.18 LibVLC/3.0.18"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    if (referer && isSafeExternalMediaUrl(referer)) {
      upstreamHeaders.set("Referer", referer);
    }
    upstreamHeaders.set("Accept", "*/*");
    const range = request.headers.get("range");
    if (range) upstreamHeaders.set("range", range);

    const isStaticSegment = effectiveUrl.includes(".ts") || effectiveUrl.includes(".m4s") || effectiveUrl.includes(".mp4");
    const upstreamRes = await fetch(effectiveUrl, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "follow",
      ...(isStaticSegment ? { cf: { cacheEverything: true, cacheTtl: 60 } } : {}),
    });

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isPlaylist = effectiveUrl.includes(".m3u8") || contentType.includes("mpegurl");
    const baseTargetUrl = upstreamRes.url || effectiveUrl;
    const origin = url.origin;
    const stEnc = encodeURIComponent(sessionToken);
    const refSuffix = referer && isSafeExternalMediaUrl(referer) ? `&ref=${encodeURIComponent(referer)}` : "";

    const buildProxyUri = (rawSeg) => {
      const abs = new URL(rawSeg, baseTargetUrl)
        .toString()
        .replace("https://livebalancer02.antenaplay.ro/", "https://live77cdn2.antenaplay.ro/");
      return `${origin}/api/stream-proxy?st=${stEnc}&url=${encodeURIComponent(abs)}${refSuffix}`;
    };

    if (isPlaylist && upstreamRes.status === 200) {
      const text = await upstreamRes.text();
      const rewritten = [];
      for (let line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
          rewritten.push("");
          continue;
        }
        if (trimmed.startsWith("#")) {
          if (trimmed.startsWith("#EXT-X-KEY") || trimmed.startsWith("#EXT-X-MEDIA") || trimmed.startsWith("#EXT-X-MAP")) {
            line = line.replace(/URI="([^"]+)"/, (_, u) => `URI="${buildProxyUri(u)}"`);
          } else if (trimmed.startsWith("#EXT-X-ENDLIST") || trimmed.startsWith("#EXT-X-PLAYLIST-TYPE")) {
            continue;
          }
          rewritten.push(line);
        } else {
          rewritten.push(buildProxyUri(trimmed));
        }
      }
      return new Response(rewritten.join("\n"), {
        status: 200,
        headers: proxyHeaders({
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        }),
      });
    }

    const resHeaders = new Headers(proxyHeaders());
    const upstreamType = upstreamRes.headers.get("content-type");
    if (upstreamType) resHeaders.set("Content-Type", upstreamType);
    else if (targetUrl.includes(".ts")) resHeaders.set("Content-Type", "video/MP2T");
    else if (targetUrl.includes(".m4s") || targetUrl.includes(".mp4")) resHeaders.set("Content-Type", "video/mp4");
    else if (targetUrl.includes(".aac")) resHeaders.set("Content-Type", "audio/aac");
    else if (targetUrl.includes(".mp3") || targetUrl.includes("stream") || targetUrl.includes("listen") || targetUrl.includes(":8")) {
      resHeaders.set("Content-Type", "audio/mpeg");
    }
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstreamRes.headers.get(h);
      if (v) resHeaders.set(h, v);
    }
    resHeaders.set("Cache-Control", isStaticSegment ? "public, max-age=60, s-maxage=120" : "no-cache, no-store, must-revalidate");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, {
      status: 502,
      headers: proxyHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }
}
