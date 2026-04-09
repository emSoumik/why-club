import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole, requireUser } from "./lib/auth";
import { appError } from "./lib/errors";

export const listApprovedByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return reviews.filter((review) => review.isApproved);
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    return await ctx.db
      .query("reviews")
      .withIndex("by_approval", (q) => q.eq("isApproved", false))
      .collect();
  },
});

export const create = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    comment: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = (
      await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect()
    ).find((review) => review.userId === user._id);

    const now = Date.now();

    if (existing) {
      await ctx.db.patch("reviews", existing._id, {
        rating: args.rating,
        comment: args.comment,
        location: args.location,
        isApproved: false,
        updatedAt: now,
      });
      return await ctx.db.get("reviews", existing._id);
    }

    return await ctx.db.insert("reviews", {
      productId: args.productId,
      userId: user._id,
      authorName: user.name ?? user.email ?? "WhÿClub customer",
      rating: args.rating,
      comment: args.comment,
      location: args.location,
      isApproved: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const moderate = mutation({
  args: {
    reviewId: v.id("reviews"),
    isApproved: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    const review = await ctx.db.get("reviews", args.reviewId);
    if (!review) {
      throw appError("NOT_FOUND", "Review not found.");
    }

    await ctx.db.patch("reviews", args.reviewId, {
      isApproved: args.isApproved,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("reviews", args.reviewId);
  },
});
