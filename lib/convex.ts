"use client";

import { ConvexReactClient } from "convex/react";

// Falls back to a placeholder so the bundle builds before the Convex
// project lands. Real value is set via NEXT_PUBLIC_CONVEX_URL in
// .env.local + Vercel env. Queries against the placeholder fail at
// runtime; build stays green.
const url =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

export const convex = new ConvexReactClient(url);
