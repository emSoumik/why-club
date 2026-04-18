import { z } from "zod";

export const cartItemSchema = z.object({
  productSlug: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

export type CartItem = z.infer<typeof cartItemSchema>;

const STORAGE_KEY = "whyclub-cart-v1";
export const CART_CHANGED_EVENT = "whyclub-cart-change";

export function parseCart(value: unknown) {
  const result = z.array(cartItemSchema).safeParse(value);
  return result.success ? result.data : [];
}

export function loadCartFromStorage(storage: Storage | undefined) {
  if (!storage) {
    return [];
  }

  try {
    return parseCart(JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function saveCartToStorage(storage: Storage | undefined, cart: CartItem[]) {
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function countCartItems(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function findCartItem(cart: CartItem[], productSlug: string, size: string) {
  return cart.find((item) => item.productSlug === productSlug && item.size === size);
}

export function updateCartQuantity(
  cart: CartItem[],
  nextItem: CartItem,
  maxQuantity = 10,
) {
  const next = cart.map((item) => ({ ...item }));
  const existing = findCartItem(next, nextItem.productSlug, nextItem.size);

  if (existing) {
    existing.quantity = Math.min(maxQuantity, existing.quantity + nextItem.quantity);
    return next;
  }

  return [...next, { ...nextItem }];
}

export function replaceCartItemQuantity(
  cart: CartItem[],
  target: Pick<CartItem, "productSlug" | "size">,
  quantity: number,
) {
  if (quantity <= 0) {
    return cart.filter(
      (item) =>
        item.productSlug !== target.productSlug || item.size !== target.size,
    );
  }

  return cart.map((item) =>
    item.productSlug === target.productSlug && item.size === target.size
      ? { ...item, quantity: Math.min(10, quantity) }
      : { ...item },
  );
}

export function removeCartItem(
  cart: CartItem[],
  target: Pick<CartItem, "productSlug" | "size">,
) {
  return cart.filter(
    (item) =>
      item.productSlug !== target.productSlug || item.size !== target.size,
  );
}

export function emitCartChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function syncCartToStorage(storage: Storage | undefined, cart: CartItem[]) {
  saveCartToStorage(storage, cart);
  emitCartChange();
}
