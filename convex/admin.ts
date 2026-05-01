import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";

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

// Soft-fail predicate for the client. Admin pages call this first and
// only run their data query when it returns true. Avoids the
// browser-console spam that requireAdmin's throw produces when a
// signed-in non-admin lands on /admin.
export const isAdmin = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    if (!user?.email) return false;
    const allow = parseAdminEmails(process.env.ADMIN_EMAILS);
    return allow.includes(user.email.toLowerCase());
  },
});

// Append-only admin action log. Call from any requireAdmin-gated
// mutation that mutates state — approves, rejects, prize draws.
// Reads (listForModeration, getDraw) intentionally don't log.
export interface AdminAuditEntry {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction(
  ctx: MutationCtx,
  admin: AdminContext,
  entry: AdminAuditEntry,
): Promise<void> {
  await ctx.db.insert("adminAuditLog", {
    action: entry.action,
    actorUserId: admin.userId,
    actorEmail: admin.email,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
  });
}
