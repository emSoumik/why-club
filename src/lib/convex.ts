import { ConvexReactClient } from "convex/react";
import { publicEnv } from "@/lib/env";

let client: ConvexReactClient | null = null;

export function hasConvexUrl() {
  return publicEnv.convexUrl.length > 0;
}

export function getConvexClient() {
  if (!hasConvexUrl()) {
    return null;
  }

  if (!client) {
    client = new ConvexReactClient(publicEnv.convexUrl);
  }

  return client;
}
