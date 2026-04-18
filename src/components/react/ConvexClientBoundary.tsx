import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { getConvexClient, hasConvexUrl } from "@/lib/convex";

type ConvexClientBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export function ConvexClientBoundary({
  children,
  fallback,
}: ConvexClientBoundaryProps) {
  const client = getConvexClient();

  if (!hasConvexUrl() || !client) {
    return <>{fallback}</>;
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
