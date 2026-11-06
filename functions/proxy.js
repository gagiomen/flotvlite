/**
 * Cloudflare Pages Function: /proxy
 * Automatically deployed by Cloudflare Pages to handle stream proxy & CORS rewriting.
 */

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const targetUrl = url.searchParams.get('url');
  const referer = url.searchParams.get('ref') || 'https://canale-tv.net/';

  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    const upstreamHeaders = new Headers();
    upstreamHeaders.set('User-Agent', 'IPTVSmartersPlayer');
    upstreamHeaders.set('Referer', referer);
    upstreamHeaders.set('Accept', '*/*');

    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders.set('range', range);
    }

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isPlaylist = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');

    if (isPlaylist && upstreamRes.status === 200) {
      const text = await upstreamRes.text();
      const lines = text.split('\n');
      const origin = url.origin;
      const rewritten = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          rewritten.push('');
          continue;
        }

        if (trimmed.startsWith('#')) {
          if (trimmed.startsWith('#EXT-X-KEY')) {
            const match = trimmed.match(/URI="([^"]+)"/);
            if (match) {
              const keyUri = new URL(match[1], targetUrl).toString();
              const proxiedKey = `${origin}/proxy?url=${encodeURIComponent(keyUri)}&ref=${encodeURIComponent(referer)}`;
              line = trimmed.replace(/URI="[^"]+"/, `URI="${proxiedKey}"`);
            }
          } else if (trimmed.startsWith('#EXT-X-ENDLIST') || trimmed.startsWith('#EXT-X-PLAYLIST-TYPE')) {
            continue;
          }
          rewritten.push(line);
        } else {
          const absUri = new URL(trimmed, targetUrl).toString();
          const proxiedUri = `${origin}/proxy?url=${encodeURIComponent(absUri)}&ref=${encodeURIComponent(referer)}`;
          rewritten.push(proxiedUri);
        }
      }

      const out = rewritten.join('\n');
      return new Response(out, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Stream media segments directly
    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
