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
- `GET /api/meta/ads?accountId=&days=&status=` — proxies the ads+creative+insights call, paginates toward a 200-ad cap, drops ads with no spend in the trailing 90 days, and runs ROAST + creative categorization on the top 50 ads by spend

## Creative analysis (ROAST + categorization)

Every pull runs the top 50 ads (by spend) through Claude for:
- **ROAST scoring** — the two-layer creative scoring framework (see `ROAST_FRAMEWORK.md` for the full spec) covering Hook Strength, Emotional Pull, Brand Linkage, Message Clarity, Audience Fit, and CTA Logic, plus diagnosis, quadrant positioning, and rewritten copy recommendations.
- **Categorization** — creative type, messaging angle, and target audience, shown as tags on each card.

For video ads, a single representative still frame is used (the video's best available thumbnail) rather than the framework's ideal of 6 sampled frames — extracting real video frames would require adding ffmpeg to the deploy, which isn't wired up yet.

Results are cached in Postgres keyed by the creative's stable identity (image hash / video ID), so the same creative reused across ads or repeated pulls is only ever analyzed and billed once.

### Required environment variables

- `ANTHROPIC_API_KEY` — Claude API key used for ROAST scoring and categorization. Without it, analysis is skipped silently (cards just show no ROAST badge/tags).
- `DATABASE_URL` — Postgres connection string for the analysis cache. On Railway, add a Postgres database to the same project (New → Database → PostgreSQL) and it auto-populates `DATABASE_URL` for linked services. Without it, analysis still runs but nothing is cached — every pull re-analyzes and re-bills the same creatives.
- `ANTHROPIC_MODEL` (optional) — overrides the default Claude model used for analysis.

## Deploying

Any Next.js host works (Vercel, Railway, etc.). Token handling requires no persistent storage, but the creative-analysis cache does — see environment variables above.
