# Majorform Live Ads — Creative Viewer

Internal tool for pulling live ad creatives and performance data from Meta ad accounts, part of the Majorform Intelligence Suite.

## Stack

- Next.js 14 (App Router) + TypeScript
- Server-side API routes proxy all Meta Graph API calls — the browser never talks to `graph.facebook.com` directly

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, paste a Meta system user token (`ads_read` + `ads_management`), load accounts, and pull ads.

## Token handling

The token lives only in browser memory (React state) for the duration of the session and is sent per-request to this app's own API routes via the `x-meta-token` header. It is never logged, persisted, or written to disk on the server — each API route reads it, uses it for that one request to Meta, and discards it.

## API routes

- `GET /api/meta/accounts` — proxies `/me/adaccounts`
- `GET /api/meta/ads?accountId=&days=&status=` — proxies the ads+creative+insights call, paginates up to 3 pages, and batch-resolves campaign names

## Deploying

Any Next.js host works (Vercel, etc.) — no environment variables or persistent storage are required since tokens are never stored server-side.
