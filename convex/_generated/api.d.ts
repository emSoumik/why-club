/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as collections from "../collections.js";
import type * as coupons from "../coupons.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_razorpay from "../lib/razorpay.js";
import type * as lib_shiprocket from "../lib/shiprocket.js";
import type * as lib_validators from "../lib/validators.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as shipping from "../shipping.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  collections: typeof collections;
  coupons: typeof coupons;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/razorpay": typeof lib_razorpay;
  "lib/shiprocket": typeof lib_shiprocket;
  "lib/validators": typeof lib_validators;
  orders: typeof orders;
  products: typeof products;
  reviews: typeof reviews;
  seed: typeof seed;
  shipping: typeof shipping;
  users: typeof users;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
