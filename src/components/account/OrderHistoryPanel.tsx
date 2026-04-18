import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { formatInr } from "@/lib/utils";
import type { DemoProduct } from "@/lib/types";
import { api } from "../../../convex/_generated/api";

type OrderHistoryPanelProps = {
  demoProducts: DemoProduct[];
};

function DemoOrderHistory({ demoProducts }: OrderHistoryPanelProps) {
  const demoOrders = [
    {
      id: "WC-24031",
      product: demoProducts[0],
      status: "paid",
      amount: demoProducts[0]?.sellingPrice ?? 0,
      placedAt: "April 3, 2026",
    },
    {
      id: "WC-24018",
      product: demoProducts[2],
      status: "delivered",
      amount: demoProducts[2]?.sellingPrice ?? 0,
      placedAt: "March 24, 2026",
    },
  ].filter((order) => order.product);

  return (
    <div className="mt-10 grid gap-4">
      {demoOrders.map((order) => (
        <article
          key={order.id}
          className="grid gap-4 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
        >
          <img
            src={order.product.images[0]}
            alt={order.product.title}
            className="h-28 w-24 rounded-[1.25rem] border border-black object-cover"
          />
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              {order.id}
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black md:text-3xl">
              {order.product.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-neutral-600">
              placed {order.placedAt} · status {order.status}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
              {formatInr(order.amount)}
            </p>
            <a
              href="/contact"
              className="mt-3 inline-block text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500"
            >
              need help
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function LiveOrderHistory() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const orders = useQuery(api.orders.listMine, isAuthenticated ? {} : "skip");

  if (isLoading) {
    return (
      <div className="mt-10 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-5 text-sm text-neutral-600">
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-10 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-6">
        <p className="text-sm leading-7 text-neutral-600">
          Sign in with Google to load your real order history from Convex.
        </p>
        <button
          type="button"
          onClick={() =>
            void signIn("google", {
              redirectTo: window.location.href,
            })}
          className="store-btn store-btn--dark mt-5"
        >
          sign in / sign up
        </button>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="mt-10 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-5 text-sm text-neutral-600">
        Loading your orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mt-10 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-5 text-sm leading-7 text-neutral-600">
        No orders yet. Once checkout is completed, paid orders show up here with
        the same status vocabulary used by the admin-facing data model.
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4">
      {orders.map((order: any) => {
        const leadItem = order.items[0];

        return (
          <article
            key={order._id}
            className="grid gap-4 rounded-[1.75rem] border border-black bg-[#f7f4ef] p-5 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                {order._id}
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black md:text-3xl">
                {leadItem?.productTitle ?? "Order"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-neutral-600">
                status {order.status} · payment {order.paymentStatus}
              </p>
              <p className="text-sm leading-7 text-neutral-600">
                {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                {formatInr(order.totalAmount)}
              </p>
              <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                {order.paymentStatus === "captured" ? "paid" : order.paymentStatus}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function OrderHistoryPanel(props: OrderHistoryPanelProps) {
  return (
    <ConvexClientBoundary fallback={<DemoOrderHistory {...props} />}>
      <LiveOrderHistory />
    </ConvexClientBoundary>
  );
}
