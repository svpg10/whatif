# Security and verification

Assets: the Gemini API credential and quota, user questions, local history, and the integrity of displayed strategies. Entry points: custom-question API, generated JSON, browser storage, public assets and CDN scripts. Main threats: secret disclosure, unbounded paid calls, stored HTML injection, corrupted state and misleading outputs. Anonymous callers and malicious AI/stored content are treated as untrusted.

## Controls implemented

- Node's built-in HTTP server serves an explicit public-file allowlist; `.env`, Git metadata, server code, schemas and test files cannot be downloaded. Symlinks resolving outside the app directory are denied. Local startup binds to loopback.
- The credential is read only on the server and sent in Google's request header, never a browser bundle or URL. The destination is fixed; redirects are refused. Questions, upstream bodies, keys and exception details are excluded from server logs.
- JSON request/type/length checks, 16 KiB body cap, 256 KiB upstream response cap, 40-second upstream deadline, client cancellation, validated AI response schema and finite 0–100 score bounds.
- No CORS permission. Browser-origin checks and a required custom header reject cross-site form calls. These are browser protections, not authentication: direct clients can call the public API.
- At most 10 requests per connection address and 50 total per hour per process, with at most 3 simultaneous upstream calls. Reverse-proxy headers cannot spoof the limiter key. Failed upstream attempts count toward the budget. Adjust through environment variables. Counters reset on restart; multiple replicas need a shared limiter. Set Google account quota/budget controls before exposure.
- Escaped/plain-text dynamic output; validated, bounded browser history, no fabricated example records, safe memory fallback and restoration of the exact saved controls. The browser ID is a display label, not an authentication mechanism.
- Security headers include CSP, no-sniff, frame blocking, restricted browser features and referrer policy. Production startup requires an explicit HTTPS APP_ORIGIN and sends HSTS. TLS must be terminated at the hosting proxy. Existing inline styles remain allowed to preserve the interface. Existing CDN animation scripts and Google Fonts remain third-party trust dependencies; the cinematic media and rendering are preserved. The app typography uses Manrope through the existing Google Fonts connection.

## Verification

Run `npm test` (or `node --test tests/app.test.cjs tests/server.test.cjs`). Tests use mocked Google responses and do not consume paid quota. Coverage includes routing, all slider effects, zero priorities, corrupt/denied storage, custom history restoration, output escaping, secret-file/path denial, origin/type/input/body validation, rate limits, provider failures and missing configuration.

No accounts, database, uploads or payment routes are implemented; their authorization/TLS/backup tests do not apply to this local source. Semgrep, CodeQL, gitleaks, ZAP, hosted TLS checks and independent penetration testing have not been run. Basic local secret-pattern checks are not a substitute for those scanners. The README's old public demo returned 404 during the initial review.

## Deployment and incident response

Vercel uses `api/scenario.js` and `api/status.js` to run the shared request handler without a listening localhost server. A generated `public/` directory contains only frontend files; environment files, backend code and tests are excluded. The status route discloses only key presence and model name, never a key or provider response. Allowed origins are the exact APP_ORIGIN and Vercel's trusted project-production, deployment and branch URLs, never a client-supplied Host header or a wildcard for all Vercel sites. In-memory limits apply per warm function instance and are not a shared spending cap. See [the setup guide](docs/GEMINI-SETUP.md).

Deploy this server behind a managed HTTPS proxy; GitHub Pages alone cannot run the API. Inject GEMINI_API_KEY through the host's secret manager, set NODE_ENV=production and APP_ORIGIN to the exact origin (no trailing slash), bind HOST only as needed by the private host, and set provider spending limits. Do not use `python -m http.server` on the repository: it can expose untracked secrets. Publish operator contact and actual hosting-log retention details before launch.

If a credential may have leaked, stop public API access, replace it in Google's console, update the server secret, revoke the exposed key and review Google quota/billing activity. Limit incident logs to request IDs/statuses. Never place real questions or keys in public issues.

Official references: [Google key security](https://ai.google.dev/gemini-api/docs/api-key), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [model availability](https://ai.google.dev/gemini-api/docs/models).
