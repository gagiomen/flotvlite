/**
 * Flo Lite TV - Native Node.js Web & Stream Proxy Server
 * Zero external dependencies. Uses only built-in Node.js modules.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.aac': 'audio/aac',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Stream Reverse Proxy Endpoint
  if (pathname === '/proxy') {
    handleStreamProxy(req, res, parsedUrl.query);
    return;
  }

  // Static File Serving
  serveStaticFile(req, res, pathname);
});

function serveStaticFile(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.json' || ext === '.png' ? 'public, max-age=86400' : 'no-cache'
    });

    if (req.method !== 'HEAD') {
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.end();
    }
  });
}

function handleStreamProxy(clientReq, clientRes, query) {
  const targetUrl = query.url;
  const referer = query.ref || 'https://canale-tv.net/';

  if (!targetUrl) {
    clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    clientRes.end('Missing target URL');
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (e) {
    clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    clientRes.end('Invalid URL: ' + targetUrl);
    return;
  }

  const isHttps = parsedTarget.protocol === 'https:';
  const client = isHttps ? https : http;

  const headers = {
    'User-Agent': 'IPTVSmartersPlayer',
    'Referer': referer,
    'Accept': '*/*'
  };

  if (clientReq.headers['range']) {
    headers['Range'] = clientReq.headers['range'];
  }

  const options = {
    protocol: parsedTarget.protocol,
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (isHttps ? 443 : 80),
    path: parsedTarget.pathname + (parsedTarget.search || ''),
    method: clientReq.method,
    headers: headers,
    rejectUnauthorized: false
  };

  const proxyReq = client.request(options, (upstreamRes) => {
    const statusCode = upstreamRes.statusCode;

    // Follow redirects (301, 302, 307, 308)
    if (statusCode >= 300 && statusCode < 400 && upstreamRes.headers.location) {
      const redirectUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
      query.url = redirectUrl;
      handleStreamProxy(clientReq, clientRes, query);
      return;
    }

    const contentType = upstreamRes.headers['content-type'] || '';
    const isPlaylist = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');

    if (isPlaylist) {
      let body = '';
      upstreamRes.setEncoding('utf-8');
      upstreamRes.on('data', chunk => { body += chunk; });
      upstreamRes.on('end', () => {
        // Rewrite HLS playlist URLs to route through proxy
        const lines = body.split('\n');
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
                const proxiedKey = `/proxy?url=${encodeURIComponent(keyUri)}&ref=${encodeURIComponent(referer)}`;
                line = trimmed.replace(/URI="[^"]+"/, `URI="${proxiedKey}"`);
              }
            } else if (trimmed.startsWith('#EXT-X-ENDLIST') || trimmed.startsWith('#EXT-X-PLAYLIST-TYPE')) {
              // Strip ENDLIST for continuous live IPTV playback
              continue;
            }
            rewritten.push(line);
          } else {
            // Segment or sub-playlist URI
            const absUri = new URL(trimmed, targetUrl).toString();
            const proxiedUri = `/proxy?url=${encodeURIComponent(absUri)}&ref=${encodeURIComponent(referer)}`;
            rewritten.push(proxiedUri);
          }
        }

        const out = rewritten.join('\n');
        clientRes.writeHead(200, {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Content-Length': Buffer.byteLength(out),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        clientRes.end(out);
      });
    } else {
      // Forward binary media segments (TS/AAC/MP3)
      const outHeaders = {
        'Content-Type': contentType || (targetUrl.includes('.ts') ? 'video/mp2t' : 'application/octet-stream'),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      };

      if (upstreamRes.headers['content-length']) {
        outHeaders['Content-Length'] = upstreamRes.headers['content-length'];
      }
      if (upstreamRes.headers['content-range']) {
        outHeaders['Content-Range'] = upstreamRes.headers['content-range'];
      }

      clientRes.writeHead(statusCode, outHeaders);
      upstreamRes.pipe(clientRes);
    }
  });

  proxyReq.on('error', (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end('Proxy upstream error: ' + err.message);
    }
  });

  proxyReq.end();
}

server.listen(PORT, () => {
  console.log(`[+] Flo Lite TV Web Server pornit pe http://localhost:${PORT}`);
});
