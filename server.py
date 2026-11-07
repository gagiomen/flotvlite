#!/usr/bin/env python3
"""
Flo Lite TV - Python Web & Stream Reverse Proxy Server
Zero dependencies. Uses standard Python 3 libraries.
"""

import os
import sys
import urllib.request
import urllib.parse
import urllib.error
import ssl
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

# Disable SSL verification for misconfigured upstream IPTV CDNs
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class FloLiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS globally
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/proxy":
            self.handle_proxy(parsed)
        else:
            super().do_GET()

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/proxy":
            self.handle_proxy(parsed, is_head=True)
        else:
            super().do_HEAD()

    def handle_proxy(self, parsed, is_head=False):
        qs = urllib.parse.parse_qs(parsed.query)
        target_url = qs.get("url", [None])[0]
        referer = qs.get("ref", ["https://canale-tv.net/"])[0]

        if not target_url:
            self.send_response(400)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Missing target url")
            return

        headers = {
            "User-Agent": "IPTVSmartersPlayer",
            "Referer": referer,
            "Accept": "*/*",
        }

        range_header = self.headers.get("Range")
        if range_header:
            headers["Range"] = range_header

        req = urllib.request.Request(target_url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=12, context=SSL_CTX) as response:
                status = response.status
                content_type = response.headers.get("Content-Type", "")
                is_playlist = ".m3u8" in target_url or "mpegurl" in content_type.lower()

                base_target = response.geturl() or target_url
                if is_playlist:
                    content = response.read().decode("utf-8", errors="ignore")
                    lines = content.splitlines()
                    rewritten = []

                    for line in lines:
                        trimmed = line.strip()
                        if not trimmed:
                            rewritten.append("")
                            continue
                        if trimmed.startswith("#"):
                            if trimmed.startswith("#EXT-X-KEY"):
                                import re
                                m = re.search(r'URI="([^"]+)"', trimmed)
                                if m:
                                    key_uri = urllib.parse.urljoin(base_target, m.group(1))
                                    proxied = f"/proxy?url={urllib.parse.quote(key_uri)}&ref={urllib.parse.quote(referer)}"
                                    line = re.sub(r'URI="[^"]+"', f'URI="{proxied}"', trimmed)
                            elif trimmed.startswith("#EXT-X-MEDIA"):
                                import re
                                m = re.search(r'URI="([^"]+)"', trimmed)
                                if m:
                                    media_uri = urllib.parse.urljoin(base_target, m.group(1))
                                    proxied = f"/proxy?url={urllib.parse.quote(media_uri)}&ref={urllib.parse.quote(referer)}"
                                    line = re.sub(r'URI="[^"]+"', f'URI="{proxied}"', trimmed)
                            elif trimmed.startswith("#EXT-X-ENDLIST") or trimmed.startswith("#EXT-X-PLAYLIST-TYPE"):
                                continue
                            rewritten.append(line)
                        else:
                            abs_uri = urllib.parse.urljoin(base_target, trimmed)
                            proxied = f"/proxy?url={urllib.parse.quote(abs_uri)}&ref={urllib.parse.quote(referer)}"
                            rewritten.append(proxied)

                    out_bytes = "\n".join(rewritten).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/vnd.apple.mpegurl")
                    self.send_header("Content-Length", str(len(out_bytes)))
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    if not is_head:
                        self.wfile.write(out_bytes)
                else:
                    self.send_response(status)
                    if ".ts" in target_url:
                        self.send_header("Content-Type", "video/mp2t")
                    elif ".mp3" in target_url or ":8" in target_url:
                        self.send_header("Content-Type", "audio/mpeg")
                    elif content_type:
                        self.send_header("Content-Type", content_type)
                    length = response.headers.get("Content-Length")
                    if length:
                        self.send_header("Content-Length", length)
                    crange = response.headers.get("Content-Range")
                    if crange:
                        self.send_header("Content-Range", crange)
                    if ".ts" in target_url or ".m4s" in target_url:
                        self.send_header("Cache-Control", "public, max-age=60")
                    else:
                        self.send_header("Cache-Control", "no-cache, no-store")
                    self.end_headers()

                    if not is_head:
                        while True:
                            chunk = response.read(65536)
                            if not chunk:
                                break
                            self.wfile.write(chunk)

        except Exception as e:
            try:
                self.send_response(502)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(f"Proxy upstream error: {str(e)}".encode("utf-8"))
            except Exception:
                pass


def main():
    server = HTTPServer(("0.0.0.0", PORT), FloLiteHandler)
    print(f"[+] Flo Lite TV Web Server ruleaza pe http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
