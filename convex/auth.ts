import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { getSuperAdminEmails } from "./lib/env";

function resolveRole(email: string | undefined, existingRole?: string) {
  if (existingRole && existingRole !== "customer") {
    return existingRole;
  }

  if (email && getSuperAdminEmails().has(email.toLowerCase())) {
    return "super_admin" as const;
  }

  return "customer" as const;
}

function defaultRedirect() {
  return process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = args.profile.email?.toLowerCase();
      const now = Date.now();

      if (args.existingUserId) {
        const existing = await ctx.db.get(args.existingUserId);
        await ctx.db.patch(args.existingUserId, {
          name: typeof args.profile.name === "string" ? args.profile.name : existing?.name,
          image:
            typeof args.profile.image === "string"
              ? args.profile.image
              : existing?.image,
          email: email ?? existing?.email,
          emailVerificationTime:
            args.profile.emailVerified === true
              ? now
              : existing?.emailVerificationTime,
          role: resolveRole(email, existing?.role),
          updatedAt: now,
        });
        return args.existingUserId;
      }

      return await ctx.db.insert("users", {
        name: typeof args.profile.name === "string" ? args.profile.name : undefined,
        image:
          typeof args.profile.image === "string" ? args.profile.image : undefined,
        email,
        emailVerificationTime: args.profile.emailVerified === true ? now : undefined,
        role: resolveRole(email),
        createdAt: now,
        updatedAt: now,
      });
    },
    async beforeSessionCreation(ctx, args) {
      await ctx.db.patch(args.userId, {
        lastSeenAt: Date.now(),
      });
    },
    async redirect({ redirectTo }) {
      if (!redirectTo) {
        return defaultRedirect();
      }

      try {
        const fallback = new URL(defaultRedirect());
        const destination = new URL(redirectTo, fallback);
        const adminHost = process.env.PUBLIC_ADMIN_HOST;
        const allowedOrigins = new Set([fallback.origin]);

        if (adminHost) {
          allowedOrigins.add(`https://${adminHost}`);
          allowedOrigins.add(`http://${adminHost}`);
        }

        if (destination.hostname === "localhost" || allowedOrigins.has(destination.origin)) {
          return destination.toString();
        }
      } catch {
        return defaultRedirect();
      }

      return defaultRedirect();
    },
  },
});
