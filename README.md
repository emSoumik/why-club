# WhÿClub e-commerce

WhÿClub is an Astro 6 storefront and admin app for Cloudflare Workers, with
Convex as the backend, Convex Auth for Google sign-in, Razorpay for payments,
and Shiprocket-ready fulfilment hooks.

## Stack

- Astro `6.1.4`
- `@astrojs/cloudflare` `13.1.7`
- React islands via `@astrojs/react` `5.0.3`
- Tailwind CSS `4.2.2`
- Convex `1.34.1`
- `@convex-dev/auth` `0.0.91`
- Wrangler `4.81.0`

## Current state

The repo now includes:

- Cloudflare Workers SSR setup with Astro middleware for `admin.<domain>`
- Convex schema, auth config, queries, mutations, actions, and HTTP actions
- client-driven Google auth controls for the storefront header
- local cart persistence with product-page add-to-cart interaction
- checkout island that creates pending orders through Convex and hands off to Razorpay
- customer order-history island backed by Convex with demo fallback
- admin overview island backed by Convex with demo fallback
- seedable demo catalog, reviews, coupon, users, and a sample order
- Razorpay and Shiprocket service layers with safe demo-mode fallbacks when credentials are missing

## Important bootstrap note

This workspace includes lightweight local files under `convex/_generated` so the
project can compile before a real Convex deployment is linked.

Before relying on live auth, live data, or seeding:

1. Run `npx convex dev` in an interactive terminal.
2. Link or create the target deployment.
3. Let Convex regenerate the official `_generated` files.
4. Keep the generated files from Convex and stop using the local stubs.

Until `PUBLIC_CONVEX_URL` is configured and the deployment is linked:

- storefront auth stays in offline fallback mode
- cart still works locally
- checkout renders in demo mode
- admin and account views fall back to demo data

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Link Convex in a separate terminal:

```bash
npx convex dev
```

4. Start Astro:

```bash
npm run dev
```

## Demo seed

After Convex is linked and `PUBLIC_CONVEX_URL` or `CONVEX_URL` is set, seed the
catalog and starter records with:

```bash
npm run seed:demo
```

`SEED_DEMO_TOKEN` is optional in local development. If set, the same token must
be provided to the seed action.

## Validation

Current verified commands:

- `npm run check`
- `npm run build`

## Environment model

Public values:

- `PUBLIC_SITE_URL`
- `PUBLIC_APP_NAME`
- `PUBLIC_ENABLE_ADMIN_SUBDOMAIN`
- `PUBLIC_ADMIN_HOST`
- `PUBLIC_CONVEX_URL`
- `PUBLIC_RAZORPAY_KEY_ID`

Server-only values:

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_SITE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPER_ADMIN_EMAILS`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SHIPROCKET_EMAIL`
- `SHIPROCKET_PASSWORD`
- `SHIPROCKET_CHANNEL_ID`
- `SHIPROCKET_PICKUP_LOCATION`
- `SEED_DEMO_TOKEN`

Keep secrets server-side. Only `PUBLIC_` variables should be exposed to the browser.
