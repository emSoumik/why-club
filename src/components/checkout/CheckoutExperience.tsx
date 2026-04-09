import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import {
  countCartItems,
  loadCartFromStorage,
  syncCartToStorage,
  type CartItem,
} from "@/lib/cart";
import { publicEnv } from "@/lib/env";
import { formatInr } from "@/lib/utils";
import type { DemoProduct } from "@/lib/types";

type ShippingFormState = {
  fullName: string;
  phoneNumber: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CheckoutExperienceProps = {
  initialProductSlug?: string;
  demoProducts: DemoProduct[];
};

type DisplayItem = {
  productSlug: string;
  productTitle: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  size: string;
  material: string;
  weightGsm: number;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  name: string;
  description: string;
  order_id: string;
  amount: number;
  currency: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

const DEFAULT_SHIPPING: ShippingFormState = {
  fullName: "",
  phoneNumber: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function getDefaultSize(product: DemoProduct) {
  return product.sizes.find((size) => !product.soldOutSizes.includes(size)) ?? product.sizes[0] ?? "M";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function useCheckoutCart(initialProductSlug: string | undefined, demoProducts: DemoProduct[]) {
  const productMap = useMemo(
    () => new Map(demoProducts.map((product) => [product.slug, product])),
    [demoProducts],
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextItems = loadCartFromStorage(window.localStorage);

    if (nextItems.length === 0 && initialProductSlug) {
      const product = productMap.get(initialProductSlug);
      if (product) {
        nextItems.push({
          productSlug: product.slug,
          quantity: 1,
          size: getDefaultSize(product),
        });
      }
    }

    setCartItems(nextItems);
    setIsReady(true);
  }, [initialProductSlug, productMap]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    syncCartToStorage(window.localStorage, cartItems);
  }, [cartItems, isReady]);

  const displayItems = useMemo<DisplayItem[]>(
    () =>
      cartItems
        .map((item) => {
          const product = productMap.get(item.productSlug);
          if (!product) {
            return null;
          }

          return {
            productSlug: item.productSlug,
            productTitle: product.title,
            imageUrl: product.images[0] ?? "",
            unitPrice: product.sellingPrice,
            quantity: item.quantity,
            size: item.size,
            material: product.material,
            weightGsm: product.weightGsm,
          };
        })
        .filter((item): item is DisplayItem => item !== null),
    [cartItems, productMap],
  );

  const subtotal = displayItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );

  return {
    cartItems,
    displayItems,
    isReady,
    isEmpty: displayItems.length === 0,
    itemCount: countCartItems(cartItems),
    subtotal,
    setCartItems,
  };
}

function EmptyCheckoutState() {
  return (
    <section className="store-shell mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="rounded-[2rem] border border-black bg-white p-8 md:p-10">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
          checkout
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-black md:text-6xl">
          Your cart is empty.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-8 text-neutral-600">
          Add a tee to the cart first. The checkout flow is wired to local cart
          storage so the experience stays consistent in demo mode and with Convex.
        </p>
        <a
          href="/collections"
          className="store-btn store-btn--dark mt-8"
        >
          browse products
        </a>
      </div>
    </section>
  );
}

type CheckoutShellProps = {
  displayItems: DisplayItem[];
  subtotal: number;
  itemCount: number;
  modeLabel: string;
  statusMessage: string | null;
  errorMessage: string | null;
  couponCode: string;
  setCouponCode: (value: string) => void;
  shipping: ShippingFormState;
  setShipping: (updater: (current: ShippingFormState) => ShippingFormState) => void;
  isSubmitting: boolean;
  onSubmit: () => void | Promise<void>;
  actionLabel: string;
  actionHint: string;
  ctaDisabled?: boolean;
};

function CheckoutShell({
  displayItems,
  subtotal,
  itemCount,
  modeLabel,
  statusMessage,
  errorMessage,
  couponCode,
  setCouponCode,
  shipping,
  setShipping,
  isSubmitting,
  onSubmit,
  actionLabel,
  actionHint,
  ctaDisabled,
}: CheckoutShellProps) {
  const shippingAmount = 0;
  const total = subtotal + shippingAmount;

  return (
    <section className="store-shell mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-16">
      <article className="rounded-[2rem] border border-black bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
              checkout
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-black md:text-6xl">
              Vulcan workflow. No checkout theatre.
            </h1>
          </div>
          <span className="rounded-full border border-black px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-black">
            {modeLabel}
          </span>
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-8 text-neutral-600">
          Pricing is derived from the cart and product catalog. In live mode, the
          backend recalculates totals, validates coupons, creates the Razorpay
          order, and verifies the payment signature before capturing the order.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-black/10 bg-[#f7f4ef] p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              delivery
            </p>
            <p className="mt-3 text-sm leading-7 text-neutral-700">
              Metro: 3 to 5 business days
              <br />
              Rest of India: 5 to 7 business days
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-black/10 bg-[#f7f4ef] p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              cart
            </p>
            <p className="mt-3 text-sm leading-7 text-neutral-700">
              {itemCount} item{itemCount === 1 ? "" : "s"}
              <br />
              Prepaid shipping: free
            </p>
          </article>
        </div>

        <div className="mt-8 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-neutral-700">
              Full name
              <input
                className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
                placeholder="Aisha Khan"
                value={shipping.fullName}
                onChange={(event) =>
                  setShipping((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))}
              />
            </label>
            <label className="grid gap-2 text-sm text-neutral-700">
              Phone number
              <input
                className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
                placeholder="+91 98xxxxxxx"
                value={shipping.phoneNumber}
                onChange={(event) =>
                  setShipping((current) => ({
                    ...current,
                    phoneNumber: event.target.value,
                  }))}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-neutral-700">
            Address
            <input
              className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
              placeholder="Flat, street, landmark"
              value={shipping.line1}
              onChange={(event) =>
                setShipping((current) => ({
                  ...current,
                  line1: event.target.value,
                }))}
            />
          </label>
          <label className="grid gap-2 text-sm text-neutral-700">
            Address line 2
            <input
              className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
              placeholder="Building, floor, near landmark"
              value={shipping.line2}
              onChange={(event) =>
                setShipping((current) => ({
                  ...current,
                  line2: event.target.value,
                }))}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm text-neutral-700 md:col-span-2">
              City
              <input
              className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
                placeholder="Bengaluru"
                value={shipping.city}
                onChange={(event) =>
                  setShipping((current) => ({
                    ...current,
                    city: event.target.value,
                  }))}
              />
            </label>
            <label className="grid gap-2 text-sm text-neutral-700">
              State
              <input
              className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
                placeholder="Karnataka"
                value={shipping.state}
                onChange={(event) =>
                  setShipping((current) => ({
                    ...current,
                    state: event.target.value,
                  }))}
              />
            </label>
            <label className="grid gap-2 text-sm text-neutral-700">
              PIN code
              <input
              className="rounded-[1.25rem] border border-black bg-white px-4 py-3"
                placeholder="560001"
                value={shipping.postalCode}
                onChange={(event) =>
                  setShipping((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="grid gap-2 text-sm text-neutral-700">
              Coupon
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3"
                placeholder="DROP01"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              />
            </label>
            <button
              type="button"
              className="store-btn"
            >
              applied on submit
            </button>
          </div>
        </div>

        {(statusMessage || errorMessage) && (
          <div
            className={`mt-6 rounded-[1.25rem] border px-5 py-4 text-sm leading-7 ${
              errorMessage
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}
      </article>

      <aside className="rounded-[2rem] border border-black bg-black p-6 text-white md:p-8">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-400">
          order summary
        </p>

        <div className="mt-6 space-y-4">
          {displayItems.map((item) => (
            <div
              key={`${item.productSlug}-${item.size}`}
              className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
            >
              <img
                src={item.imageUrl}
                alt={item.productTitle}
                className="h-24 w-20 rounded-[1.25rem] border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black uppercase tracking-[-0.05em] md:text-3xl">
                  {item.productTitle}
                </h2>
                <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-400">
                  size {item.size} · qty {item.quantity}
                </p>
                <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  {item.material} · {item.weightGsm} gsm
                </p>
              </div>
              <div className="text-right text-sm font-medium text-white">
                {formatInr(item.unitPrice * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4 text-sm">
          <div className="flex justify-between text-neutral-300">
            <span>Subtotal</span>
            <span>{formatInr(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-300">
            <span>Shipping</span>
            <span>{shippingAmount === 0 ? "Free" : formatInr(shippingAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-4 text-base font-medium text-white">
            <span>Total</span>
            <span>{formatInr(total)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={ctaDisabled || isSubmitting}
          onClick={() => void onSubmit()}
          className="store-btn store-btn--inverse mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "processing..." : actionLabel}
        </button>

        <p className="mt-4 text-xs leading-6 text-neutral-400">{actionHint}</p>
      </aside>
    </section>
  );
}

function DemoCheckout({
  displayItems,
  subtotal,
  itemCount,
}: {
  displayItems: DisplayItem[];
  subtotal: number;
  itemCount: number;
}) {
  const [shipping, setShipping] = useState(DEFAULT_SHIPPING);
  const [couponCode, setCouponCode] = useState("");

  return (
    <CheckoutShell
      displayItems={displayItems}
      subtotal={subtotal}
      itemCount={itemCount}
      modeLabel="demo checkout"
      statusMessage={null}
      errorMessage={null}
      couponCode={couponCode}
      setCouponCode={setCouponCode}
      shipping={shipping}
      setShipping={setShipping}
      isSubmitting={false}
      onSubmit={() => {}}
      actionLabel="configure Convex first"
      actionHint="Set PUBLIC_CONVEX_URL and connect a Convex deployment to enable secure order creation, auth, and Razorpay checkout."
      ctaDisabled
    />
  );
}

function LiveCheckout({
  cartItems,
  displayItems,
  subtotal,
  setCartItems,
}: {
  cartItems: CartItem[];
  displayItems: DisplayItem[];
  subtotal: number;
  setCartItems: Dispatch<SetStateAction<CartItem[]>>;
}) {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, {});
  const liveProducts = useQuery(
    api.products.getManyBySlugs,
    cartItems.length === 0
      ? "skip"
      : {
          slugs: cartItems.map((item) => item.productSlug),
        },
  ) as Array<any> | undefined;
  const createPendingOrder = useMutation(api.orders.createPending);
  const createCheckoutSession = useAction(api.orders.createCheckoutSession);
  const verifyPayment = useAction(api.orders.verifyPayment);
  const markPaymentFailure = useMutation(api.orders.markPaymentFailure);
  const [shipping, setShipping] = useState<ShippingFormState>(DEFAULT_SHIPPING);
  const [couponCode, setCouponCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRazorpayReady, setIsRazorpayReady] = useState(false);

  useEffect(() => {
    if (!publicEnv.razorpayKeyId) {
      return;
    }

    if (window.Razorpay) {
      setIsRazorpayReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsRazorpayReady(true);
    script.onerror = () => setIsRazorpayReady(false);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    const savedAddress = user?.shippingAddress;
    if (!savedAddress) {
      return;
    }

    setShipping((current) =>
      current.fullName || current.phoneNumber || current.line1
        ? current
        : {
            fullName: savedAddress.fullName,
            phoneNumber: savedAddress.phoneNumber,
            line1: savedAddress.line1,
            line2: savedAddress.line2 ?? "",
            city: savedAddress.city,
            state: savedAddress.state,
            postalCode: savedAddress.postalCode,
            country: savedAddress.country,
          },
    );
  }, [user]);

  const actionHint = isLoading
    ? "Checking your session..."
    : !isAuthenticated
      ? "Sign in with Google to create the order in Convex and start the secure Razorpay flow."
      : "Convex validates prices and coupons before handing off to Razorpay. Demo mode is used automatically when Razorpay secrets are not configured.";

  async function openRazorpayCheckout(orderId: Id<"orders">, session: any) {
    if (!publicEnv.razorpayKeyId || !window.Razorpay || session.mode === "demo") {
      setStatusMessage(
        `Pending order ${orderId} created in demo mode. Add Razorpay credentials to switch to live checkout.`,
      );
      setCartItems([]);
      return;
    }

    const checkout = new window.Razorpay({
      key: publicEnv.razorpayKeyId,
      name: "WhÿClub",
      description: "Oversized graphic tee checkout",
      order_id: session.razorpayOrderId,
      amount: session.amount * 100,
      currency: session.currency,
      prefill: {
        name: shipping.fullName,
        email: user?.email,
        contact: shipping.phoneNumber,
      },
      notes: {
        appOrderId: orderId,
      },
      theme: {
        color: "#111111",
      },
      handler: async (response) => {
        try {
          const verification = await verifyPayment({
            orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          if (verification.ok) {
            setCartItems([]);
            setStatusMessage("Payment captured and order verified. Your order is now visible in account history.");
            setErrorMessage(null);
          } else {
            setErrorMessage("Payment verification failed. Please try again.");
          }
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        }
      },
      modal: {
        ondismiss: () => {
          void markPaymentFailure({
            orderId,
            reason: "Checkout closed before payment completion.",
          });
        },
      },
    });

    checkout.open();
  }

  async function handleSubmit() {
    if (!isAuthenticated) {
      setErrorMessage("Sign in with Google before continuing to payment.");
      setStatusMessage(null);
      return;
    }

    if (!liveProducts) {
      setErrorMessage("Product data is still loading. Try again in a moment.");
      setStatusMessage(null);
      return;
    }

    if (!shipping.fullName || !shipping.phoneNumber || !shipping.line1 || !shipping.city || !shipping.state || !shipping.postalCode) {
      setErrorMessage("Fill in the required shipping details before continuing.");
      setStatusMessage(null);
      return;
    }

    const liveProductMap = new Map(
      liveProducts.map((product: any) => [product.slug, product]),
    );
    const orderItems = cartItems.map((item) => {
      const product = liveProductMap.get(item.productSlug);
      if (!product) {
        throw new Error(`${item.productSlug} is missing from the live catalog.`);
      }

      return {
        productId: product._id,
        quantity: item.quantity,
        size: item.size,
      };
    });

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const pendingOrder = await createPendingOrder({
        items: orderItems,
        shippingAddress: {
          ...shipping,
          line2: shipping.line2 || undefined,
        },
        couponCode: couponCode || undefined,
      });

      const checkoutSession = await createCheckoutSession({
        orderId: pendingOrder.orderId,
      });

      await openRazorpayCheckout(pendingOrder.orderId, checkoutSession);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <CheckoutShell
        displayItems={displayItems}
        subtotal={subtotal}
        itemCount={countCartItems(cartItems)}
        modeLabel="secure checkout"
        statusMessage="Checking your session and loading catalog data..."
        errorMessage={null}
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        shipping={shipping}
        setShipping={setShipping}
        isSubmitting
        onSubmit={handleSubmit}
        actionLabel="loading session"
        actionHint="This step waits for Convex Auth before enabling the payment flow."
        ctaDisabled
      />
    );
  }

  return (
    <CheckoutShell
      displayItems={displayItems}
      subtotal={subtotal}
      itemCount={countCartItems(cartItems)}
      modeLabel={isAuthenticated ? "secure checkout" : "auth required"}
      statusMessage={statusMessage}
      errorMessage={errorMessage}
      couponCode={couponCode}
      setCouponCode={setCouponCode}
      shipping={shipping}
      setShipping={setShipping}
      isSubmitting={isSubmitting}
      onSubmit={
        isAuthenticated
          ? handleSubmit
          : async () => {
              await signIn("google", {
                redirectTo: window.location.href,
              });
            }
      }
      actionLabel={
        isAuthenticated
          ? isRazorpayReady || !publicEnv.razorpayKeyId
            ? "continue to payment"
            : "loading Razorpay"
          : "sign in with Google"
      }
      actionHint={actionHint}
      ctaDisabled={isAuthenticated ? !!publicEnv.razorpayKeyId && !isRazorpayReady : false}
    />
  );
}

export default function CheckoutExperience({
  initialProductSlug,
  demoProducts,
}: CheckoutExperienceProps) {
  const checkoutCart = useCheckoutCart(initialProductSlug, demoProducts);

  if (!checkoutCart.isReady) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 text-sm text-neutral-600 md:px-6">
        Loading checkout...
      </section>
    );
  }

  if (checkoutCart.isEmpty) {
    return <EmptyCheckoutState />;
  }

  return (
    <ConvexClientBoundary
      fallback={
        <DemoCheckout
          displayItems={checkoutCart.displayItems}
          itemCount={checkoutCart.itemCount}
          subtotal={checkoutCart.subtotal}
        />
      }
    >
      <LiveCheckout
        cartItems={checkoutCart.cartItems}
        displayItems={checkoutCart.displayItems}
        subtotal={checkoutCart.subtotal}
        setCartItems={checkoutCart.setCartItems}
      />
    </ConvexClientBoundary>
  );
}
