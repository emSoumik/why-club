import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { formatInr } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

type AdminOverviewLiveProps = {
  demoProductsLength: number;
  demoCollectionsLength: number;
  totalInventory: number;
  projectedRevenue: number;
};

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <p className="text-[0.68rem] uppercase tracking-[0.3em] text-neutral-500">
        {label}
      </p>
      <div className="mt-4 font-display text-4xl tracking-[-0.08em] text-neutral-950">
        {value}
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{note}</p>
    </article>
  );
}

function DemoOverview(props: AdminOverviewLiveProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-4">
      <MetricCard
        label="products"
        value={`${props.demoProductsLength}`}
        note="Current live SKUs in the seeded drop."
      />
      <MetricCard
        label="collections"
        value={`${props.demoCollectionsLength}`}
        note="Collection model is ready for future drops."
      />
      <MetricCard
        label="inventory"
        value={`${props.totalInventory}`}
        note="Total units across the demo catalog."
      />
      <MetricCard
        label="projected GMV"
        value={formatInr(props.projectedRevenue)}
        note="Potential top-line if current inventory clears."
      />
    </section>
  );
}

function LiveOverview() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const summary = useQuery(
    api.orders.dashboardSummary,
    user && ["super_admin", "admin"].includes(user.role) ? {} : "skip",
  );

  if (isLoading) {
    return (
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-6 text-sm text-neutral-600 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
        Checking admin session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
        <p className="text-sm leading-7 text-neutral-600">
          Sign in with Google to load live admin metrics from Convex. Until then,
          the seeded catalog metrics below stay available in demo mode.
        </p>
        <button
          type="button"
          onClick={() =>
            void signIn("google", {
              redirectTo: window.location.href,
            })}
          className="mt-5 rounded-full bg-neutral-950 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-neutral-800"
        >
          sign in
        </button>
      </div>
    );
  }

  if (user && !["super_admin", "admin"].includes(user.role)) {
    return (
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-6 text-sm leading-7 text-neutral-600 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
        Your account is signed in as <strong>{user.role}</strong>. Admin metrics are
        restricted to <code>super_admin</code> and <code>admin</code>.
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-[1.75rem] border border-black/10 bg-white p-6 text-sm text-neutral-600 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
        Loading live metrics...
      </div>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-4">
      <MetricCard
        label="orders"
        value={`${summary.totalOrders}`}
        note="Total orders visible to the current admin."
      />
      <MetricCard
        label="paid"
        value={`${summary.paidOrders}`}
        note="Orders with captured Razorpay payments."
      />
      <MetricCard
        label="pending"
        value={`${summary.pendingOrders}`}
        note="Orders awaiting payment or operational action."
      />
      <MetricCard
        label="revenue"
        value={formatInr(summary.revenue)}
        note="Captured revenue from live Convex order data."
      />
    </section>
  );
}

export default function AdminOverviewLive(props: AdminOverviewLiveProps) {
  return (
    <ConvexClientBoundary fallback={<DemoOverview {...props} />}>
      <LiveOverview />
    </ConvexClientBoundary>
  );
}
