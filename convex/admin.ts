import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// Centralised admin-allowlist check. Every admin-only function must
// call this. Throws ConvexError("forbidden") for anyone outside the
// ADMIN_EMAILS env var.
//
// ADMIN_EMAILS is a comma-separated list of email addresses. Set via:
//   npx convex env set ADMIN_EMAILS mark@example.com,adam@bwf.org

export function parseAdminEmails(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export interface AdminContext {
  userId: Id<"users">;
  email: string;
}

export async function requireAdmin(ctx: QueryCtx): Promise<AdminContext> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("unauthenticated");

  const user = await ctx.db.get(userId);
  if (!user?.email) throw new ConvexError("forbidden");

  const allow = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (!allow.includes(user.email.toLowerCase())) {
    throw new ConvexError("forbidden");
  }

  return { userId, email: user.email };
}
