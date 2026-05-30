/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as donations from "../donations.js";
import type * as email from "../email.js";
import type * as holds from "../holds.js";
import type * as http from "../http.js";
import type * as prizeDraw from "../prizeDraw.js";
import type * as rateLimit from "../rateLimit.js";
import type * as seats from "../seats.js";
import type * as stripe from "../stripe.js";
import type * as tributes from "../tributes.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  auth: typeof auth;
  crons: typeof crons;
  donations: typeof donations;
  email: typeof email;
  holds: typeof holds;
  http: typeof http;
  prizeDraw: typeof prizeDraw;
  rateLimit: typeof rateLimit;
  seats: typeof seats;
  stripe: typeof stripe;
  tributes: typeof tributes;
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
