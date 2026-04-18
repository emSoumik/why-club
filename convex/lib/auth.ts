import {
  getAuthUserId,
} from "@convex-dev/auth/server";
import type {
  ActionCtx,
  MutationCtx,
  QueryCtx,
} from "../_generated/server";
import { appError } from "./errors";

type Role = "super_admin" | "admin" | "editor" | "customer";

type Ctx = {
  auth: QueryCtx["auth"] | MutationCtx["auth"];
  db: QueryCtx["db"] | MutationCtx["db"];
};

type ActionAuthCtx = {
  auth: ActionCtx["auth"];
};

export async function getCurrentIdentity(ctx: { auth: Ctx["auth"] | ActionAuthCtx["auth"] }) {
  return await ctx.auth.getUserIdentity();
}

export async function getCurrentUser(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const user = await ctx.db.get("users", userId);
  return user ?? null;
}

export async function requireUser(ctx: Ctx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw appError("UNAUTHENTICATED", "You must sign in to continue.");
  }
  return user;
}

export async function requireAnyRole(ctx: Ctx, roles: Role[]) {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role)) {
    throw appError("FORBIDDEN", "You do not have access to this action.");
  }
  return user;
}

export async function requireRole(ctx: Ctx, role: Role) {
  return requireAnyRole(ctx, [role]);
}

export async function requireActionUserId(ctx: ActionAuthCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw appError("UNAUTHENTICATED", "You must sign in to continue.");
  }
  return userId;
}
