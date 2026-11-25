/**
 * Cloudflare Worker: Stream Proxy & CORS Rewriting
 * High-performance edge proxy with caching for FloLite Universal 3.0
 */

export default {
  async fetch(request, env, ctx) {
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
    const referer = url.searchParams.get('ref') || '';

    if (!targetUrl) {
      return new Response('FloLite Universal 3.0 Proxy Ready. Usage: ?url=<stream_url>&ref=<referer>', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    try {
      let effectiveUrl = targetUrl;
      if (effectiveUrl.includes('radiozu.ro/live')) {
        const pageRes = await fetch('https://radiozu.ro/live', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
        });
        const html = await pageRes.text();
        const match = html.match(/https:\/\/ivm\.antenaplay\.ro\/live\/zurtv\/playlist\.m3u8[^"'\s<>]+/);
        if (match) {
          effectiveUrl = match[0].replace(/&amp;/g, '&');
        }
      }

      const parsedTarget = new URL(effectiveUrl);
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsedTarget.hostname)) {
        const sslipHost = parsedTarget.hostname.replace(/\./g, '-') + '.sslip.io';
        effectiveUrl = `${parsedTarget.protocol}//${sslipHost}${parsedTarget.port ? ':' + parsedTarget.port : ''}${parsedTarget.pathname}${parsedTarget.search}`;
      }

      const isAudioLike = !effectiveUrl.includes('.m3u8') && (effectiveUrl.includes('.mp3') || effectiveUrl.includes('.aac') || effectiveUrl.includes('listen') || /:\d{4}/.test(effectiveUrl));
      const upstreamHeaders = new Headers();
      upstreamHeaders.set('User-Agent', isAudioLike
        ? 'VLC/3.0.18 LibVLC/3.0.18'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      if (referer) {
        upstreamHeaders.set('Referer', referer);
      }
      upstreamHeaders.set('Accept', '*/*');

      const range = request.headers.get('range');
      if (range) {
        upstreamHeaders.set('range', range);
      }

      const isStaticSegment = effectiveUrl.includes('.ts') || effectiveUrl.includes('.m4s') || effectiveUrl.includes('.mp4');

      const fetchOptions = {
        method: request.method,
        headers: upstreamHeaders,
        redirect: 'follow',
      };

      if (isStaticSegment) {
        fetchOptions.cf = {
          cacheEverything: true,
          cacheTtl: 60,
        };
      }

      const upstreamRes = await fetch(effectiveUrl, fetchOptions);

      const contentType = upstreamRes.headers.get('content-type') || '';
      const isPlaylist = effectiveUrl.includes('.m3u8') || contentType.includes('mpegurl');

      const baseTargetUrl = upstreamRes.url || effectiveUrl;
      const origin = url.origin;

      const refSuffix = referer ? `&ref=${encodeURIComponent(referer)}` : '';

      if (isPlaylist && upstreamRes.status === 200) {
        const text = await upstreamRes.text();
        const lines = text.split('\n');
        const rewritten = [];

        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            rewritten.push('');
            continue;
          }

          if (trimmed.startsWith('#')) {
            if (trimmed.startsWith('#EXT-X-KEY')) {
              line = line.replace(/URI="([^"]+)"/, (_, keyUri) => {
                const absUri = new URL(keyUri, baseTargetUrl).toString();
                return `URI="${origin}/?url=${encodeURIComponent(absUri)}${refSuffix}"`;
              });
            } else if (trimmed.startsWith('#EXT-X-MEDIA')) {
              line = line.replace(/URI="([^"]+)"/, (_, mediaUri) => {
                const absUri = new URL(mediaUri, baseTargetUrl).toString();
                return `URI="${origin}/?url=${encodeURIComponent(absUri)}${refSuffix}"`;
              });
            } else if (trimmed.startsWith('#EXT-X-MAP')) {
              line = line.replace(/URI="([^"]+)"/, (_, mapUri) => {
                const absUri = new URL(mapUri, baseTargetUrl).toString();
                return `URI="${origin}/?url=${encodeURIComponent(absUri)}${refSuffix}"`;
              });
            } else if (trimmed.startsWith('#EXT-X-ENDLIST') || trimmed.startsWith('#EXT-X-PLAYLIST-TYPE')) {
              continue;
            }
            rewritten.push(line);
          } else {
            const absUri = new URL(trimmed, baseTargetUrl).toString();
            const proxiedUri = `${origin}/?url=${encodeURIComponent(absUri)}${refSuffix}`;
            rewritten.push(proxiedUri);
          }
        }

        const out = rewritten.join('\n');
        return new Response(out, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      const upstreamType = upstreamRes.headers.get('content-type');
      if (upstreamType) {
        responseHeaders.set('Content-Type', upstreamType);
      } else if (targetUrl.includes('.ts')) {
        responseHeaders.set('Content-Type', 'video/MP2T');
      } else if (targetUrl.includes('.m4s') || targetUrl.includes('.mp4')) {
        responseHeaders.set('Content-Type', 'video/mp4');
      } else if (targetUrl.includes('.aac')) {
        responseHeaders.set('Content-Type', 'audio/aac');
      } else if (targetUrl.includes('.mp3') || targetUrl.includes('stream') || targetUrl.includes('listen') || targetUrl.includes(':8')) {
        responseHeaders.set('Content-Type', 'audio/mpeg');
      }

      const cl = upstreamRes.headers.get('content-length');
      if (cl) responseHeaders.set('Content-Length', cl);
      const cr = upstreamRes.headers.get('content-range');
      if (cr) responseHeaders.set('Content-Range', cr);
      const ar = upstreamRes.headers.get('accept-ranges');
      if (ar) responseHeaders.set('Accept-Ranges', ar);

      if (isStaticSegment) {
        responseHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
      } else {
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

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
  },
};
