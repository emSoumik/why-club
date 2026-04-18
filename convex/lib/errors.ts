import { ConvexError } from "convex/values";

export function appError(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  return new ConvexError({
    code,
    message,
    ...details,
  });
}
