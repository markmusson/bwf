import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema source of truth: design/07-convex-pivot.md §5 plus the additions
// in design/07b-pivot-audit.md §11 (Gift Aid confirmations, marketing
// consent, sponsor tag).
//
// Money is integer pence everywhere. No floats.

export default defineSchema({
  ...authTables,

  seats: defineTable({
    stand: v.string(),
    row: v.number(),
    num: v.number(),
    status: v.union(v.literal("available"), v.literal("taken")),
    donationId: v.optional(v.id("donations")),
  })
    .index("by_coord", ["stand", "row", "num"])
    .index("by_status", ["status"]),

  holds: defineTable({
    seatId: v.id("seats"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_seat", ["seatId"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  tributes: defineTable({
    donationId: v.id("donations"),
    text: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    profanityScore: v.optional(v.number()),
  }).index("by_status", ["status"]),

  donations: defineTable({
    userId: v.id("users"),
    seatId: v.optional(v.id("seats")),
    amountPence: v.number(),
    currency: v.literal("GBP"),
    giftAid: v.boolean(),
    giftAidConfirmations: v.optional(
      v.object({
        ukTaxpayer: v.boolean(),
        ownMoney: v.boolean(),
        noBenefit: v.boolean(),
        declaredAt: v.number(),
      }),
    ),
    hideName: v.boolean(),
    hideAmount: v.boolean(),
    displayName: v.optional(v.string()),
    avatarConfig: v.optional(v.string()),
    marketingOptIn: v.optional(v.boolean()),
    marketingConsentRecordedAt: v.optional(v.number()),
    tag: v.optional(v.string()),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
    receiptSentAt: v.optional(v.number()),
  })
    .index("by_session", ["stripeSessionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  prizeEntries: defineTable({
    donationId: v.id("donations"),
    userId: v.id("users"),
    method: v.union(v.literal("online"), v.literal("postal")),
    address: v.optional(v.string()),
  }).index("by_donation", ["donationId"]),

  // Free postal entries — UK Gambling Commission requires a no-purchase
  // route for charity prize draws. Admin keys these in from postal mail
  // received at the BWF address. Counted equally with online entries
  // when runDraw snapshots the entry list.
  postalEntries: defineTable({
    name: v.string(),
    address: v.string(),
    receivedAt: v.number(),
    enteredByUserId: v.id("users"),
  }).index("by_received", ["receivedAt"]),

  stripeEvents: defineTable({
    eventId: v.string(),
    receivedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // Per-key fixed-window counter. Cheap anti-spam for user-facing
  // mutations: createDraft, holds.claim, tributes.update, etc. Each
  // key is "<action>:<userId>" or "<action>:<ip>" for unauthenticated
  // calls. consumeRateLimit reads + writes a single row per call.
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStartAt: v.number(),
  }).index("by_key", ["key"]),

  // Append-only audit trail for admin actions. Every requireAdmin-gated
  // mutation should log here so we can answer "who approved X and
  // when?" without trawling logs. Indexed by actor + action so we can
  // pull a per-admin or per-action stream without scanning.
  adminAuditLog: defineTable({
    action: v.string(),
    actorUserId: v.id("users"),
    actorEmail: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    metadata: v.optional(v.string()),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_action", ["action"]),

  // Audit record for the prize draw. drawName is the idempotency key —
  // re-running with the same name returns the original record. seed +
  // entryIds + the published algorithm let any third party replay the
  // draw and verify the winner. entryIds use a tagged-string format
  // ("online:<id>" or "postal:<id>") so the union of online and free
  // postal entries can be captured in one ordered list.
  prizeDraws: defineTable({
    drawName: v.string(),
    seed: v.string(),
    entryCount: v.number(),
    entryIds: v.array(v.string()),
    winnerType: v.union(v.literal("online"), v.literal("postal")),
    winnerEntryRef: v.string(),
    winnerOnlineEntryId: v.optional(v.id("prizeEntries")),
    winnerPostalEntryId: v.optional(v.id("postalEntries")),
    winnerDonationId: v.optional(v.id("donations")),
    runByUserId: v.id("users"),
  }).index("by_name", ["drawName"]),
});
