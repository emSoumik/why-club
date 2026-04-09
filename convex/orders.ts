import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAnyRole, requireUser } from "./lib/auth";
import { appError } from "./lib/errors";
import {
  createRazorpayOrder,
  verifyCheckoutSignature,
} from "./lib/razorpay";
import {
  orderItemInputValidator,
  shippingAddressValidator,
} from "./lib/validators";
import type { Doc, Id } from "./_generated/dataModel";

const ORDER_CURRENCY = "INR";
type OrderDoc = Doc<"orders">;

type CheckoutSessionResult =
  | {
      mode: "existing";
      orderId: Id<"orders">;
      razorpayOrderId?: string;
    }
  | {
      mode: "demo" | "live";
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
      receipt: string;
    };

type VerifyPaymentResult =
  | {
      ok: false;
    }
  | {
      ok: true;
      paymentResult: OrderDoc | null;
    };

function computeDiscount(
  coupon: { discountType: "percentage" | "fixed"; discountValue: number },
  subtotal: number,
) {
  if (coupon.discountType === "percentage") {
    return Math.round((subtotal * coupon.discountValue) / 100);
  }

  return Math.min(subtotal, coupon.discountValue);
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    return await ctx.db.query("orders").collect();
  },
});

export const getById = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order) {
      return null;
    }

    const canAccess =
      order.userId === user._id || ["super_admin", "admin"].includes(user.role);

    if (!canAccess) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    return order;
  },
});

export const dashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const orders = await ctx.db.query("orders").collect();
    const revenue = orders
      .filter((order) => order.paymentStatus === "captured")
      .reduce((total, order) => total + order.totalAmount, 0);

    return {
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => order.paymentStatus === "captured").length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      revenue,
    };
  },
});

export const createPending = mutation({
  args: {
    items: v.array(orderItemInputValidator),
    shippingAddress: shippingAddressValidator,
    couponCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.items.length === 0) {
      throw appError("INVALID_INPUT", "Add at least one item before checkout.");
    }

    const products = await Promise.all(
      args.items.map((item) => ctx.db.get("products", item.productId)),
    );

    const snapshots = args.items.map((item, index) => {
      const product = products[index];
      if (!product || !product.isPublished) {
        throw appError("NOT_FOUND", "One or more products are unavailable.");
      }

      if (item.quantity > product.inventoryCount) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} does not have enough inventory.`,
        );
      }

      if (item.size && product.soldOutSizes.includes(item.size)) {
        throw appError(
          "OUT_OF_STOCK",
          `${product.title} is sold out in size ${item.size}.`,
        );
      }

      return {
        productId: product._id,
        productSlug: product.slug,
        productTitle: product.title,
        quantity: item.quantity,
        size: item.size,
        unitPrice: product.sellingPrice,
        lineTotal: product.sellingPrice * item.quantity,
      };
    });

    const subtotal = snapshots.reduce((total, item) => total + item.lineTotal, 0);

    let couponId: any;
    let couponCode: string | undefined;
    let discountAmount = 0;

    const normalizedCouponCode = args.couponCode?.toUpperCase();

    if (normalizedCouponCode) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", normalizedCouponCode))
        .unique();

      if (!coupon || !coupon.isActive) {
        throw appError("INVALID_COUPON", "Coupon code is invalid.");
      }

      if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
        throw appError("INVALID_COUPON", "Coupon code has expired.");
      }

      if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
        throw appError("INVALID_COUPON", "Coupon usage limit has been reached.");
      }

      if (subtotal < coupon.minOrderValue) {
        throw appError(
          "INVALID_COUPON",
          `Coupon requires an order value of ₹${coupon.minOrderValue} or more.`,
        );
      }

      couponId = coupon._id;
      couponCode = coupon.code;
      discountAmount = computeDiscount(coupon, subtotal);
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const now = Date.now();

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
      couponId,
      couponCode,
      status: "pending",
      paymentStatus: "pending",
      shippingAddress: args.shippingAddress,
      items: snapshots,
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId,
      totalAmount,
      discountAmount,
      currency: ORDER_CURRENCY,
    };
  },
});

export const markPaymentFailure = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);

    if (!order || order.userId !== user._id) {
      throw appError("FORBIDDEN", "Order not found.");
    }

    await ctx.db.patch("orders", args.orderId, {
      paymentStatus: "failed",
      paymentFailureReason: args.reason,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("orders", args.orderId);
  },
});

export const createCheckoutSession = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<CheckoutSessionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order || order.userId !== userId) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    if (order.paymentStatus === "captured") {
      return {
        mode: "existing",
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
      };
    }

    const checkout = await createRazorpayOrder({
      amount: order.totalAmount,
      currency: order.currency,
      receipt: `${order._id}`,
      notes: {
        orderId: `${order._id}`,
      },
    });

    await ctx.runMutation(internal.orders.attachRazorpayOrder, {
      orderId: order._id,
      razorpayOrderId: checkout.razorpayOrderId,
    });

    return checkout;
  },
});

export const verifyPayment = action({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<VerifyPaymentResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("UNAUTHENTICATED", "You must sign in to continue.");
    }

    const order: OrderDoc | null = await ctx.runQuery(internal.orders.getForAction, {
      orderId: args.orderId,
    });

    if (!order || order.userId !== userId) {
      throw appError("FORBIDDEN", "You do not have access to this order.");
    }

    const valid = await verifyCheckoutSignature({
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
    });

    if (!valid) {
      await ctx.runMutation(internal.orders.markPaymentFailedInternal, {
        orderId: args.orderId,
        reason: "Invalid Razorpay signature.",
      });

      return {
        ok: false,
      };
    }

    const paymentResult: OrderDoc | null = await ctx.runMutation(
      internal.orders.markPaidInternal,
      {
        orderId: args.orderId,
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
      },
    );

    await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
      orderId: args.orderId,
    });

    return {
      ok: true,
      paymentResult,
    };
  },
});

export const getForAction = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("orders", args.orderId);
  },
});

export const findByRazorpayOrderId = internalQuery({
  args: {
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();
  },
});

export const attachRazorpayOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("orders", args.orderId, {
      razorpayOrderId: args.razorpayOrderId,
      updatedAt: Date.now(),
    });
    return await ctx.db.get("orders", args.orderId);
  },
});

export const markPaymentFailedInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    await ctx.db.patch("orders", args.orderId, {
      paymentStatus: "failed",
      paymentFailureReason: args.reason,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("orders", args.orderId);
  },
});

export const markPaidInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      throw appError("NOT_FOUND", "Order not found.");
    }

    if (order.paymentStatus === "captured") {
      return order;
    }

    const now = Date.now();
    await ctx.db.patch("orders", args.orderId, {
      status: "paid",
      paymentStatus: "captured",
      razorpayOrderId: args.razorpayOrderId ?? order.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      paymentFailureReason: undefined,
      paidAt: now,
      updatedAt: now,
    });

    for (const item of order.items) {
      const product = await ctx.db.get("products", item.productId);
      if (!product) {
        continue;
      }

      await ctx.db.patch("products", item.productId, {
        inventoryCount: Math.max(0, product.inventoryCount - item.quantity),
        updatedAt: now,
      });
    }

    if (order.couponId) {
      const coupon = await ctx.db.get("coupons", order.couponId);
      if (coupon) {
        await ctx.db.patch("coupons", order.couponId, {
          usedCount: coupon.usedCount + 1,
          updatedAt: now,
        });
      }
    }

    return await ctx.db.get("orders", args.orderId);
  },
});

export const updateShippingStateInternal = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.optional(v.union(v.literal("processing"), v.literal("shipped"), v.literal("delivered"))),
    shiprocketOrderId: v.optional(v.string()),
    shiprocketShipmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (!order) {
      return null;
    }

    await ctx.db.patch("orders", args.orderId, {
      status: args.status ?? order.status,
      shiprocketOrderId: args.shiprocketOrderId ?? order.shiprocketOrderId,
      shiprocketShipmentId:
        args.shiprocketShipmentId ?? order.shiprocketShipmentId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("orders", args.orderId);
  },
});
