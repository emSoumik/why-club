import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole } from "./lib/auth";
import { appError } from "./lib/errors";
import { discountTypeValidator } from "./lib/validators";

function isCouponUsable(coupon: {
  isActive: boolean;
  expiresAt?: number;
  usageLimit?: number;
  usedCount: number;
}) {
  if (!coupon.isActive) {
    return false;
  }

  if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
    return false;
  }

  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return false;
  }

  return true;
}

function computeDiscount(
  coupon: { discountType: "percentage" | "fixed"; discountValue: number },
  subtotal: number,
) {
  if (coupon.discountType === "percentage") {
    return Math.round((subtotal * coupon.discountValue) / 100);
  }

  return Math.min(subtotal, coupon.discountValue);
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    return await ctx.db.query("coupons").collect();
  },
});

export const validateCode = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!coupon || !isCouponUsable(coupon)) {
      return {
        valid: false,
        discountAmount: 0,
      };
    }

    if (args.subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
      };
    }

    return {
      valid: true,
      couponId: coupon._id,
      discountAmount: computeDiscount(coupon, args.subtotal),
      couponCode: coupon.code,
    };
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    title: v.optional(v.string()),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderValue: v.number(),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const code = args.code.toUpperCase();
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existing) {
      throw appError("CONFLICT", "Coupon code already exists.");
    }

    const now = Date.now();
    return await ctx.db.insert("coupons", {
      ...args,
      code,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    couponId: v.id("coupons"),
    title: v.optional(v.string()),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderValue: v.number(),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const coupon = await ctx.db.get("coupons", args.couponId);
    if (!coupon) {
      throw appError("NOT_FOUND", "Coupon not found.");
    }

    await ctx.db.patch("coupons", args.couponId, {
      title: args.title,
      discountType: args.discountType,
      discountValue: args.discountValue,
      minOrderValue: args.minOrderValue,
      usageLimit: args.usageLimit,
      expiresAt: args.expiresAt,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("coupons", args.couponId);
  },
});

export const incrementUsage = mutation({
  args: {
    couponId: v.id("coupons"),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get("coupons", args.couponId);
    if (!coupon) {
      throw appError("NOT_FOUND", "Coupon not found.");
    }

    await ctx.db.patch("coupons", args.couponId, {
      usedCount: coupon.usedCount + 1,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});
