function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

export const publicEnv = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
  appName: import.meta.env.PUBLIC_APP_NAME ?? "WhÿClub",
  adminHost: import.meta.env.PUBLIC_ADMIN_HOST ?? "admin.localhost",
  enableAdminSubdomain: parseBoolean(
    import.meta.env.PUBLIC_ENABLE_ADMIN_SUBDOMAIN,
  ),
  convexUrl: import.meta.env.PUBLIC_CONVEX_URL ?? "",
  razorpayKeyId: import.meta.env.PUBLIC_RAZORPAY_KEY_ID ?? "",
};

export function isConfiguredForConvex() {
  return publicEnv.convexUrl.length > 0;
}
