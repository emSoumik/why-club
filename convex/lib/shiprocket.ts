import { readOptionalEnv } from "./env";

const API_BASE = "https://apiv2.shiprocket.in/v1/external";

type ShiprocketAuth = {
  email: string;
  password: string;
  pickupLocation: string;
  channelId?: string;
};

function getShiprocketConfig(): ShiprocketAuth | null {
  const email = readOptionalEnv("SHIPROCKET_EMAIL");
  const password = readOptionalEnv("SHIPROCKET_PASSWORD");
  const pickupLocation = readOptionalEnv("SHIPROCKET_PICKUP_LOCATION");

  if (!email || !password || !pickupLocation) {
    return null;
  }

  return {
    email,
    password,
    pickupLocation,
    channelId: readOptionalEnv("SHIPROCKET_CHANNEL_ID"),
  };
}

async function getAccessToken(config: ShiprocketAuth) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: config.email,
      password: config.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shiprocket login failed: ${response.status}`);
  }

  const json = (await response.json()) as { token: string };
  return json.token;
}

export async function createShipment(order: {
  orderId: string;
  totalAmount: number;
  customerName: string;
  email?: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  items: Array<{ name: string; sku: string; units: number; sellingPrice: number }>;
}) {
  const config = getShiprocketConfig();
  if (!config) {
    return {
      mode: "demo" as const,
      skipped: true,
      reason: "Shiprocket credentials are not configured.",
      shiprocketOrderId: undefined,
      shiprocketShipmentId: undefined,
      awbCode: undefined,
    };
  }

  const token = await getAccessToken(config);
  const response = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: order.orderId,
      order_date: new Date().toISOString(),
      pickup_location: config.pickupLocation,
      channel_id: config.channelId,
      comment: "Created from WhÿClub admin",
      billing_customer_name: order.customerName,
      billing_last_name: "",
      billing_address: order.addressLine1,
      billing_address_2: order.addressLine2 ?? "",
      billing_city: order.city,
      billing_pincode: order.postalCode,
      billing_state: order.state,
      billing_country: order.country,
      billing_email: order.email ?? "support@whyclub.in",
      billing_phone: order.phoneNumber,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
      })),
      payment_method: "Prepaid",
      sub_total: order.totalAmount,
      length: 28,
      breadth: 20,
      height: 3,
      weight: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shiprocket order creation failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    order_id?: number;
    shipment_id?: number;
    awb_code?: string;
  };

  return {
    mode: "live" as const,
    skipped: false,
    shiprocketOrderId: json.order_id?.toString(),
    shiprocketShipmentId: json.shipment_id?.toString(),
    awbCode: json.awb_code,
  };
}

export async function fetchTracking(shipmentId: string) {
  const config = getShiprocketConfig();
  if (!config) {
    return {
      mode: "demo" as const,
      skipped: true,
      trackingStatus: "demo_pending_dispatch",
    };
  }

  const token = await getAccessToken(config);
  const response = await fetch(
    `${API_BASE}/courier/track/shipment/${shipmentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Shiprocket tracking fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    tracking_data?: {
      shipment_track_activities?: Array<{
        sr_status_label?: string;
        location?: string;
        date?: string;
      }>;
    };
  };

  const latest = json.tracking_data?.shipment_track_activities?.[0];
  return {
    mode: "live" as const,
    skipped: false,
    trackingStatus: latest?.sr_status_label ?? "tracking_unavailable",
    location: latest?.location,
    timestamp: latest?.date,
  };
}
