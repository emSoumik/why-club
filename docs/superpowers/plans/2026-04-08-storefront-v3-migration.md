# Storefront V3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `index-v3.html` storefront design into the Astro app and deliver coherent cart, checkout, and auth/account storefront pages on top of the existing cart and Convex flows.

**Architecture:** Rebuild the standalone v3 HTML into shared Astro storefront primitives so the same visual system applies to home, collection, product, cart, checkout, and account pages. Keep the current local-cart and Convex auth/checkout behavior, but reorganize and restyle the UI around reusable components instead of static one-off markup.

**Tech Stack:** Astro, React islands, Tailwind CSS v4, Convex Auth, existing localStorage cart helpers

---

### Task 1: Shared Storefront Shell

**Files:**
- Modify: `src/layouts/StorefrontLayout.astro`
- Modify: `src/components/storefront/SiteHeader.astro`
- Modify: `src/components/storefront/SiteFooter.astro`
- Modify: `src/components/react/StorefrontClient.tsx`
- Modify: `src/styles/global.css`

- [ ] Move the v3 visual tokens, background treatment, announcement/header structure, and shared shell classes into the Astro storefront layout.
- [ ] Replace the current header controls with storefront navigation plus auth/cart/account entry points that work across all customer-facing pages.
- [ ] Align footer styling with the v3 visual system without changing route structure.

### Task 2: Catalog Page Migration

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/collections/index.astro`
- Modify: `src/pages/collections/[slug].astro`
- Modify: `src/pages/products/[slug].astro`
- Modify: `src/components/storefront/ProductCard.astro`
- Modify: `src/components/storefront/SectionHeader.astro`

- [ ] Rebuild the home page around the v3 hero, ticker, product grid rhythm, manifesto, trust, and social-proof sections using demo data.
- [ ] Restyle collection and product pages so they inherit the same editorial storefront language.
- [ ] Update reusable product cards and section headers so the catalog pages stay visually consistent.

### Task 3: Cart, Checkout, and Auth/Account

**Files:**
- Create: `src/pages/cart.astro`
- Create: `src/pages/account/index.astro`
- Create: `src/pages/auth.astro`
- Modify: `src/components/checkout/CheckoutExperience.tsx`
- Modify: `src/components/account/OrderHistoryPanel.tsx`
- Modify: `src/lib/cart.ts` if additional cart helpers are required

- [ ] Add a dedicated cart page with quantity controls, remove actions, subtotal, and empty state powered by the existing local cart storage.
- [ ] Redesign checkout as a sharper demo/live flow while preserving the current Convex and Razorpay logic.
- [ ] Add a dedicated auth entry page and account landing page that connect to the current Google auth flow and the existing orders page.

### Task 4: Validation

**Files:**
- No new product code expected unless fixes are required

- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Fix any type or build regressions caused by the storefront migration.
