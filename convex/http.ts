import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/webhooks/razorpay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    const result = await ctx.runAction(internal.webhooks.handleRazorpayWebhook, {
      rawBody,
      signature,
    });

    return Response.json(result, {
      status: result.ok ? 200 : 202,
    });
  }),
});

http.route({
  path: "/webhooks/shiprocket",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const result = await ctx.runAction(internal.webhooks.handleShiprocketWebhook, {
      rawBody,
    });

    return Response.json(result, {
      status: result.ok ? 200 : 202,
    });
  }),
});

export default http;
