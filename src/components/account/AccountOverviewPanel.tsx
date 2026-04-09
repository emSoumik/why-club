import { useConvexAuth, useQuery } from "convex/react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { api } from "../../../convex/_generated/api";

function AccountOfflinePanel() {
  return (
    <section className="store-shell mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
          account
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
          Account goes live with auth.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
          The storefront shell is ready, but account data depends on a live Convex
          auth session. Use the auth page once the deployment is connected.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/auth" className="store-btn store-btn--dark">
            open auth
          </a>
          <a href="/cart" className="store-btn">
            view cart
          </a>
        </div>
      </div>
    </section>
  );
}

function AccountLivePanel() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <section className="store-shell mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[2rem] border border-black bg-white p-8 md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
            account
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
            Own the customer side cleanly.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
            Keep sign-in, orders, and checkout inside one identity. This account
            surface is intentionally narrow so the customer journey stays obvious.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <a href="/account/orders" className="rounded-[1.5rem] border border-black bg-[#f7f4ef] p-5 transition hover:bg-[#f0ece3]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
                orders
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                View history
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-600">
                Track paid orders, fulfilment states, and support routes.
              </p>
            </a>
            <a href="/checkout" className="rounded-[1.5rem] border border-black bg-[#f7f4ef] p-5 transition hover:bg-[#f0ece3]">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
                checkout
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                Resume flow
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-600">
                Continue into the live or demo payment handoff with your session.
              </p>
            </a>
          </div>
        </article>

        <aside className="rounded-[2rem] border border-black bg-black p-8 text-white md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-400">
            member state
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
              session
            </p>
            <p className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-white">
              {isLoading
                ? "loading"
                : isAuthenticated
                  ? user?.name ?? user?.email ?? "member"
                  : "signed out"}
            </p>
            <p className="mt-3 text-sm leading-7 text-neutral-400">
              {isAuthenticated
                ? "Authenticated customers can place orders and see backend-backed history."
                : "You are not signed in yet. Use the auth page before expecting real account data."}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/auth" className="store-btn store-btn--inverse">
              auth page
            </a>
            <a href="/cart" className="store-btn store-btn--outline-light">
              cart
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function AccountOverviewPanel() {
  return (
    <ConvexClientBoundary fallback={<AccountOfflinePanel />}>
      <AccountLivePanel />
    </ConvexClientBoundary>
  );
}
