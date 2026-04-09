import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  CART_CHANGED_EVENT,
  countCartItems,
  loadCartFromStorage,
  syncCartToStorage,
  type CartItem,
  updateCartQuantity,
} from "@/lib/cart";
import { getConvexClient, hasConvexUrl } from "@/lib/convex";

export function useCartState() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const refresh = () => {
      setCart(loadCartFromStorage(window.localStorage));
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(CART_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CART_CHANGED_EVENT, refresh);
    };
  }, []);

  const setAndPersistCart = (next: CartItem[]) => {
    setCart(next);
    syncCartToStorage(window.localStorage, next);
  };

  return {
    cart,
    count: countCartItems(cart),
    setAndPersistCart,
  };
}

function ConvexGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => getConvexClient(), []);

  if (!client) {
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}

function buttonClassName(mode: "dark" | "light" | "ghost" = "light") {
  if (mode === "dark") {
    return "rounded-full border border-black bg-black px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-[#1c1c1c]";
  }

  if (mode === "ghost") {
    return "rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500 transition hover:border-black/25 hover:text-neutral-950";
  }

  return "rounded-full border border-black/10 bg-white/90 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-800 transition hover:border-black/25 hover:text-black";
}

export function AuthActionButton({
  label = "sign in / sign up",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { signIn } = useAuthActions();

  return (
    <button
      type="button"
      onClick={() => {
        void signIn("google", {
          redirectTo: window.location.href,
        });
      }}
      className={className ?? buttonClassName()}
    >
      {label}
    </button>
  );
}

function HeaderAuthState() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  if (isLoading) {
    return <span className={buttonClassName("ghost")}>auth...</span>;
  }

  if (!isAuthenticated) {
    return (
      <a href="/auth" className={buttonClassName()}>
        auth
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a href="/account" className={buttonClassName()}>
        {user?.name?.split(" ")[0] ?? "account"}
      </a>
      <button
        type="button"
        onClick={() => void signOut()}
        className={buttonClassName("ghost")}
      >
        sign out
      </button>
    </div>
  );
}

export function HeaderAuthCartControls() {
  const { count } = useCartState();

  if (!hasConvexUrl()) {
    return (
      <div className="flex items-center gap-2">
        <a href="/auth" className={buttonClassName("ghost")}>
          auth offline
        </a>
        <a href="/cart" className={buttonClassName("dark")}>
          cart {count}
        </a>
      </div>
    );
  }

  return (
    <ConvexGate>
      <div className="flex items-center gap-2">
        <HeaderAuthState />
        <a href="/cart" className={buttonClassName("dark")}>
          cart {count}
        </a>
      </div>
    </ConvexGate>
  );
}

export function ProductAddToCart(props: {
  productSlug: string;
  productTitle: string;
  priceLabel: string;
  availableSizes: string[];
  soldOutSizes: string[];
  checkoutHref: string;
}) {
  const { count, cart, setAndPersistCart } = useCartState();
  const initialSize =
    props.availableSizes.find((size) => !props.soldOutSizes.includes(size)) ??
    props.availableSizes[0] ??
    "";
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedSize) {
      return;
    }

    if (!props.soldOutSizes.includes(selectedSize)) {
      return;
    }

    const fallbackSize = props.availableSizes.find(
      (size) => !props.soldOutSizes.includes(size),
    );
    if (fallbackSize) {
      setSelectedSize(fallbackSize);
    }
  }, [props.availableSizes, props.soldOutSizes, selectedSize]);

  const canAdd =
    selectedSize.length > 0 && !props.soldOutSizes.includes(selectedSize);

  return (
    <div className="rounded-[1.75rem] border border-black bg-white/70 p-5 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-black pb-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
            cart
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.12em] text-neutral-900">
            {count} item{count === 1 ? "" : "s"} loaded
          </p>
        </div>
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-900">
          {props.priceLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {props.availableSizes.map((size) => {
          const soldOut = props.soldOutSizes.includes(size);
          const active = selectedSize === size;

          return (
            <button
              key={size}
              type="button"
              disabled={soldOut}
              onClick={() => setSelectedSize(size)}
              className={[
                "rounded-full border px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.3em] transition",
                soldOut
                  ? "cursor-not-allowed border-black/5 bg-neutral-100 text-neutral-400 line-through"
                  : active
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-neutral-800 hover:border-black",
              ].join(" ")}
            >
              {size}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          className="rounded-full border border-black px-3 py-2 text-sm text-neutral-800"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((value) => Math.min(10, value + 1))}
          className="rounded-full border border-black px-3 py-2 text-sm text-neutral-800"
        >
          +
        </button>
        <div className="ml-auto text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500">
          {props.productTitle}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) {
              setMessage("Select an available size first.");
              return;
            }

            const nextCart = updateCartQuantity(cart, {
              productSlug: props.productSlug,
              size: selectedSize,
              quantity,
            });

            setAndPersistCart(nextCart);
            setMessage(`Added ${quantity} to cart.`);
          }}
          className="rounded-full bg-black px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          add to cart
        </button>
        <a
          href="/cart"
          className="rounded-full border border-black px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-900 transition hover:bg-black hover:text-white"
        >
          view cart
        </a>
        <a
          href={props.checkoutHref}
          className="rounded-full border border-black/10 px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-600 transition hover:border-black/30 hover:text-neutral-950"
        >
          direct checkout
        </a>
      </div>

      {message && (
        <p className="mt-4 text-[0.68rem] uppercase tracking-[0.24em] text-neutral-500">
          {message}
        </p>
      )}
    </div>
  );
}

export function StorefrontClientBridge() {
  return null;
}
