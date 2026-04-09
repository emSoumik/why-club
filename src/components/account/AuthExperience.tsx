import { useConvexAuth, useQuery } from "convex/react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { AuthActionButton } from "@/components/react/StorefrontClient";
import { api } from "../../../convex/_generated/api";

function AuthOfflinePanel() {
  return (
    <section className="store-shell mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="rounded-[2rem] border border-black bg-white p-8 md:p-10">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
          auth
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
          Sign-in is configured for live mode.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
          Connect Convex Auth to enable Google sign-in and sign-up. The storefront
          design is live either way, but authentication requires the deployed auth
          provider.
        </p>
      </div>
    </section>
  );
}

function AuthLivePanel() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <section className="store-shell mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[2rem] border border-black bg-white p-8 md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
            auth
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
            Enter the club without the friction.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
            The current flow uses Google for both sign-up and sign-in, then hands
            the session to Convex so checkout and order history stay tied to one
            account.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isLoading ? (
              <span className="store-btn store-btn--ghost">auth...</span>
            ) : isAuthenticated ? (
              <>
                <a href="/account" className="store-btn store-btn--dark">
                  go to account
                </a>
                <a href="/account/orders" className="store-btn">
                  open orders
                </a>
              </>
            ) : (
              <AuthActionButton className="store-btn store-btn--dark" />
            )}
          </div>

          {isAuthenticated && user && (
            <div className="mt-8 rounded-[1.5rem] border border-black bg-[#f7f4ef] p-5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
                signed in as
              </p>
              <p className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-black">
                {user.name ?? user.email ?? "WhÿClub member"}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[2rem] border border-black bg-black p-8 text-white md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-400">
            why sign in
          </p>
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-black uppercase tracking-[0.04em]">
                Faster checkout
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Saved identity and shipping details feed directly into the live
                checkout flow.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-black uppercase tracking-[0.04em]">
                Real order history
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Paid orders appear in your account with the same payment and
                fulfilment states stored in the backend.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-black uppercase tracking-[0.04em]">
                Single customer identity
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Google handles both first-time sign-up and returning sign-in. No
                separate password workflow is required in this version.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function AuthExperience() {
  return (
    <ConvexClientBoundary fallback={<AuthOfflinePanel />}>
      <AuthLivePanel />
    </ConvexClientBoundary>
  );
}
