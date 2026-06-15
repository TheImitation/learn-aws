#!/usr/bin/env python3
"""Static dev server for the web app that disables caching.

`python3 -m http.server` lets the browser cache ES modules aggressively, so
edits to src/*.js or styles.css don't show up on reload. Sending no-store on
every response keeps reloads fresh during development.
"""
import http.server
import socketserver

PORT = 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="web", **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"serving web/ on http://localhost:{PORT} (no-store)")
        httpd.serve_forever()
