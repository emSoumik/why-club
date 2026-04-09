import { defineMiddleware } from "astro:middleware";
import { publicEnv } from "@/lib/env";

function getSiteOrigin() {
  try {
    return new URL(publicEnv.siteUrl).origin;
  } catch {
    return "http://localhost:4321";
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!publicEnv.enableAdminSubdomain) {
    return next();
  }

  const url = new URL(context.request.url);
  const isAdminHost = url.hostname === publicEnv.adminHost;

  if (isAdminHost) {
    if (url.pathname === "/") {
      return context.rewrite("/admin");
    }

    if (!url.pathname.startsWith("/admin")) {
      return context.rewrite(`/admin${url.pathname}`);
    }

    return next();
  }

  if (url.pathname.startsWith("/admin")) {
    return context.redirect(getSiteOrigin());
  }

  return next();
});
