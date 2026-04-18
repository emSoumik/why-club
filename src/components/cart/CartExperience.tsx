import { useMemo } from "react";
import {
  removeCartItem,
  replaceCartItemQuantity,
  type CartItem,
} from "@/lib/cart";
import { demoProducts } from "@/lib/demo-data";
import { formatInr } from "@/lib/utils";
import { useCartState } from "@/components/react/StorefrontClient";

export default function CartExperience() {
  const { cart, count, setAndPersistCart } = useCartState();

  const items = useMemo(
    () =>
      cart
        .map((item) => {
          const product = demoProducts.find(
            (candidate) => candidate.slug === item.productSlug,
          );

          if (!product) {
            return null;
          }

          return {
            ...item,
            product,
            total: item.quantity * product.sellingPrice,
          };
        })
        .filter(
          (
            item,
          ): item is CartItem & {
            product: (typeof demoProducts)[number];
            total: number;
          } => item !== null,
        ),
    [cart],
  );

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  if (items.length === 0) {
    return (
      <section className="store-shell mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="rounded-[2rem] border border-black bg-white p-8 md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
            cart
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
            Your cart is lonely.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
            Build the basket first. The cart is powered by local storefront state,
            so it keeps pace with the checkout flow in both demo and live modes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/collections" className="store-btn store-btn--dark">
              browse products
            </a>
            <a href="/" className="store-btn">
              back home
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="store-shell mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-black bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black pb-6">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
                cart
              </p>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] text-black md:text-6xl">
                Built to review before you commit.
              </h1>
            </div>
            <span className="rounded-full border border-black px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-black">
              {count} item{count === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            {items.map((item) => (
              <article
                key={`${item.product.slug}-${item.size}`}
                className="grid gap-4 rounded-[1.75rem] border border-black/10 bg-[#f7f4ef] p-4 md:grid-cols-[10rem_1fr_auto]"
              >
                <a
                  href={`/products/${item.product.slug}`}
                  className="overflow-hidden rounded-[1.25rem] bg-white"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="aspect-[3/4] w-full object-cover"
                  />
                </a>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-red-600">
                        {item.product.badge}
                      </p>
                      <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-black md:text-3xl">
                        {item.product.title}
                      </h2>
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
                      {formatInr(item.total)}
                    </p>
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                    {item.product.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                    <span>size {item.size}</span>
                    <span>{item.product.material}</span>
                    <span>{item.product.weightGsm} gsm</span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setAndPersistCart(
                          replaceCartItemQuantity(
                            cart,
                            item,
                            Math.max(0, item.quantity - 1),
                          ),
                        )}
                      className="rounded-full border border-black px-3 py-2 text-sm"
                    >
                      -
                    </button>
                    <span className="min-w-10 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAndPersistCart(
                          replaceCartItemQuantity(
                            cart,
                            item,
                            Math.min(10, item.quantity + 1),
                          ),
                        )}
                      className="rounded-full border border-black px-3 py-2 text-sm"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setAndPersistCart(removeCartItem(cart, item))}
                      className="ml-auto rounded-full border border-black/10 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-600 transition hover:border-black hover:text-black"
                    >
                      remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="rounded-[2rem] border border-black bg-black p-6 text-white md:p-8">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-400">
            summary
          </p>
          <div className="mt-6 space-y-4 border-b border-white/10 pb-6 text-sm">
            <div className="flex justify-between text-neutral-300">
              <span>subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>shipping</span>
              <span>free prepaid</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>checkout mode</span>
              <span>razor-sharp demo</span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-neutral-500">
              total
            </p>
            <p className="mt-3 text-4xl font-black uppercase tracking-[-0.05em] text-white">
              {formatInr(subtotal)}
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-400">
              Review, adjust, then move into the checkout workflow. Live mode
              validates prices server-side before Razorpay handoff.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <a href="/checkout" className="store-btn store-btn--inverse">
              continue to checkout
            </a>
            <a href="/collections" className="store-btn store-btn--outline-light">
              add another product
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
