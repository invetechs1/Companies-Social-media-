# SocialHub Pro

A **multi-tenant, white-label social media management platform** — the same category of product as Hootsuite, Buffer and Sprout Social, but one **you own outright** and can resell to other companies under your own brand.

Built for managing all social accounts of your companies:

- **Azoom**
- **Alarrab**
- **MCC (Hadathah)**

…and for onboarding unlimited customer companies as paying tenants.

> **Why not just clone Hootsuite/Buffer?** Those are closed-source — their code cannot be cloned. The strongest open-source alternative (Postiz) is AGPL-licensed, which would legally force you to publish your source code if you sell or host it commercially. SocialHub Pro is written from scratch for this repository, so **you hold 100% of the IP and can sell it with no license restrictions.**

---

## Features

| Area | What you get |
|---|---|
| **Publishing** | Compose once → publish to Facebook Pages, Instagram Business, X (Twitter), LinkedIn, TikTok and YouTube |
| **Scheduling** | Content calendar with month view; posts publish automatically at the chosen time |
| **Approval workflow** | Editors draft → managers approve/reject → auto-publish. Full audit trail |
| **Multi-company** | Isolated workspaces per company (accounts, posts, media, team, branding) |
| **Team & roles** | Owner / Admin / Editor / Viewer per workspace |
| **Media library** | Upload and reuse images & videos (stored per workspace) |
| **Analytics** | Followers / impressions / engagement snapshots per account, with trends |
| **White-label** | Per-tenant brand color, logo, custom domain field |
| **Reselling** | Super-admin "Tenants" panel: onboard customer companies, assign plans (Starter/Pro/Enterprise), suspend/activate |

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** — one codebase for frontend + API
- **Prisma ORM** — SQLite out of the box, switch to PostgreSQL for production by changing `DATABASE_URL` and the `provider` in `prisma/schema.prisma`
- **Tailwind CSS** — clean, responsive UI
- **JWT sessions** (jose) + bcrypt password hashing
- Zero external SaaS dependencies — self-host anywhere Node.js runs

## Quick start

```bash
# 1. Install & set up (installs deps, creates DB, seeds your 3 companies)
cp .env.example .env       # then edit AUTH_SECRET etc.
npm run setup

# 2. Run the app
npm run dev                # http://localhost:3000

# 3. Run the scheduler (separate terminal) so scheduled posts go out
npm run worker
```

**Seeded login:** `invetechs@gmail.com` / `Admin@1234` → **change this password immediately.**
The seed creates three workspaces: Azoom, Alarrab, MCC (Hadathah), with you as super-admin (platform owner).

## Connecting real social accounts

Each platform requires a (free) developer app. Put the keys in `.env` (see `.env.example`), restart, then click **Connect** on the *Social accounts* page. The OAuth redirect URI for every platform is:

```
{APP_URL}/api/oauth/{provider}/callback
```

| Platform | Where to create the app | Key env vars |
|---|---|---|
| Facebook Pages / Instagram Business | [developers.facebook.com](https://developers.facebook.com) | `META_APP_ID`, `META_APP_SECRET` |
| X (Twitter) | [developer.x.com](https://developer.x.com) (OAuth 2.0, scopes incl. `tweet.write`, `offline.access`) | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` |
| LinkedIn | [developer.linkedin.com](https://developer.linkedin.com) (`w_member_social`) | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| TikTok | [developers.tiktok.com](https://developers.tiktok.com) (`video.publish`) | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| YouTube | [console.cloud.google.com](https://console.cloud.google.com) (YouTube Data API v3) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

Platform notes:

- **Instagram** requires an Instagram **Business/Creator** account linked to a Facebook Page, and media must be hosted at a public URL (deploy the app publicly or use a CDN for images).
- **TikTok** posting requires your developer app to be approved for the Content Posting API.
- **Meta apps** start in Development mode — add yourself as a tester, then request Advanced Access (`pages_manage_posts`, `instagram_content_publish`) to publish for any account.

## Scheduling in production

Two options (either works):

1. **Worker process:** run `npm run worker` alongside the web app (PM2, systemd, Docker sidecar).
2. **Cron webhook:** have any scheduler call `GET {APP_URL}/api/cron/publish` every minute with header `Authorization: Bearer $CRON_SECRET` (Vercel Cron, GitHub Actions, crontab).

## Selling the system to other companies

You are the **platform owner** (super-admin). From **Dashboard → Tenants**:

1. Click *Onboard a new company* → a fresh isolated workspace is created.
2. Add their staff from that workspace's *Team* page (they only ever see their own workspace).
3. Set their plan/status (trial, active, suspended) — enforce your own pricing (suggested: Starter $29/mo, Pro $79/mo, Enterprise custom).
4. White-label: set their logo, brand color and custom domain in *Settings*.

New companies can also self-signup at `/signup` (14-day trial workspace).

For payments, plug in Stripe/Paddle later — the `plan` / `planStatus` fields on `Organization` are the integration point.

## Production deployment

```bash
# PostgreSQL recommended in production:
#   1. In prisma/schema.prisma change provider to "postgresql"
#   2. Set DATABASE_URL to your postgres URL
npx prisma db push
npm run build
npm start          # plus `npm run worker` for the scheduler
```

Deploy anywhere Node runs: a VPS with PM2/nginx, Docker, Railway, Render, or Vercel (use Vercel Cron for publishing and S3-style storage for media uploads).

**Production checklist**

- [ ] Strong `AUTH_SECRET` and `CRON_SECRET`
- [ ] HTTPS (required by all social platforms' OAuth)
- [ ] PostgreSQL instead of SQLite
- [ ] Change the seeded admin password
- [ ] Consider encrypting stored access tokens at rest (e.g. KMS) for extra hardening

## Project structure

```
prisma/schema.prisma          # data model (tenants, posts, accounts, approvals, metrics)
prisma/seed.ts                # seeds admin + Azoom / Alarrab / MCC (Hadathah)
scripts/worker.ts             # scheduler loop (publishes due posts every 60s)
src/lib/providers/            # one adapter per platform (OAuth + publish API calls)
src/lib/publisher.ts          # publishing engine (per-target success/failure)
src/app/api/                  # REST API (auth, orgs, posts, oauth, media, cron)
src/app/dashboard/[orgId]/    # workspace UI (composer, calendar, approvals, …)
src/app/dashboard/admin/      # platform-owner tenant management (reselling)
```
