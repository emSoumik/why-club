import { readOptionalEnv, readRequiredEnv } from "./env";

const API_BASE = "https://api.razorpay.com/v1";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toHex(signature);
}

function getLiveConfig() {
  const keyId = readOptionalEnv("PUBLIC_RAZORPAY_KEY_ID");
  const keySecret = readOptionalEnv("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return null;
  }
  return { keyId, keySecret };
}

export function getCheckoutMode() {
  return getLiveConfig() ? "live" : "demo";
}

export async function createRazorpayOrder(args: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const liveConfig = getLiveConfig();
  if (!liveConfig) {
    return {
      mode: "demo" as const,
      keyId: "demo_key_id",
      razorpayOrderId: `demo_order_${crypto.randomUUID()}`,
      amount: args.amount,
      currency: args.currency,
      receipt: args.receipt,
    };
  }

  const authHeader = Buffer.from(
    `${liveConfig.keyId}:${liveConfig.keySecret}`,
  ).toString("base64");

  const response = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: args.amount * 100,
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
    }),
  });

  if (!response.ok) {
    throw new Error(`Razorpay order creation failed: ${response.status}`);
  }

  const json = (await response.json()) as { id: string };
  return {
    mode: "live" as const,
    keyId: liveConfig.keyId,
    razorpayOrderId: json.id,
    amount: args.amount,
    currency: args.currency,
    receipt: args.receipt,
  };
}

export async function verifyCheckoutSignature(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const liveConfig = getLiveConfig();
  if (!liveConfig) {
    return true;
  }

  const expected = await hmacSha256Hex(
    liveConfig.keySecret,
    `${args.razorpayOrderId}|${args.razorpayPaymentId}`,
  );
  return expected === args.razorpaySignature;
}

export async function verifyWebhookSignature(args: {
  rawBody: string;
  signature: string | null;
}) {
  const secret = readOptionalEnv("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    return {
      verified: false,
      skipped: true,
      reason: "RAZORPAY_WEBHOOK_SECRET is not configured.",
    };
  }

  if (!args.signature) {
    return {
      verified: false,
      skipped: false,
      reason: "Missing Razorpay webhook signature header.",
    };
  }

  const expected = await hmacSha256Hex(secret, args.rawBody);
  return {
    verified: expected === args.signature,
    skipped: false,
  };
}

export function requireRazorpaySiteUrl() {
  return readRequiredEnv("CONVEX_SITE_URL");
}
