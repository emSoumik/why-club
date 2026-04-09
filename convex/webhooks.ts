import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyWebhookSignature } from "./lib/razorpay";

export const handleRazorpayWebhook = internalAction({
  args: {
    rawBody: v.string(),
    signature: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const signatureCheck = await verifyWebhookSignature(args);
    if (!signatureCheck.verified) {
      return {
        ok: false,
        ...signatureCheck,
      };
    }

    const payload = JSON.parse(args.rawBody) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            order_id?: string;
            id?: string;
            error_description?: string;
          };
        };
      };
    };

    const payment = payload.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;

    if (!razorpayOrderId) {
      return {
        ok: false,
        reason: "Missing Razorpay order reference.",
      };
    }

    const order = await ctx.runQuery(internal.orders.findByRazorpayOrderId, {
      razorpayOrderId,
    });

    if (!order) {
      return {
        ok: false,
        reason: "Order not found for webhook payload.",
      };
    }

    if (payload.event === "payment.captured") {
      await ctx.runMutation(internal.orders.markPaidInternal, {
        orderId: order._id,
        razorpayOrderId,
        razorpayPaymentId: payment?.id ?? `webhook_${Date.now()}`,
      });

      await ctx.runAction(internal.shipping.createShipmentForPaidOrder, {
        orderId: order._id,
      });
    }

    if (payload.event === "payment.failed") {
      await ctx.runMutation(internal.orders.markPaymentFailedInternal, {
        orderId: order._id,
        reason: payment?.error_description ?? "Razorpay reported payment failure.",
      });
    }

    return {
      ok: true,
      event: payload.event ?? "unknown",
    };
  },
});

export const handleShiprocketWebhook = internalAction({
  args: {
    rawBody: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = JSON.parse(args.rawBody) as Record<string, unknown>;
    const shipmentId =
      typeof payload.shipment_id === "string"
        ? payload.shipment_id
        : typeof payload.shipment_id === "number"
          ? `${payload.shipment_id}`
          : undefined;

    if (!shipmentId) {
      return {
        ok: false,
        reason: "Missing shipment identifier.",
      };
    }

    const orders = await ctx.runQuery(internal.shipping.findOrderByShipmentId, {
      shipmentId,
    });

    if (!orders) {
      return {
        ok: false,
        reason: "Order not found for Shiprocket webhook.",
      };
    }

    const status =
      typeof payload.current_status === "string"
        ? payload.current_status
        : typeof payload.status === "string"
          ? payload.status
          : "tracking_update_received";

    await ctx.runMutation(internal.shipping.recordTrackingUpdateInternal, {
      orderId: orders._id,
      awbCode:
        typeof payload.awb_code === "string" ? payload.awb_code : undefined,
      courierName:
        typeof payload.courier_name === "string"
          ? payload.courier_name
          : "Shiprocket",
      trackingStatus: status,
      location:
        typeof payload.current_location === "string"
          ? payload.current_location
          : undefined,
      trackedAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});
