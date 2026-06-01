import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { moderateTribute } from "../lib/moderation";
import { STANDS } from "../lib/stands";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { logAdminAction, requireAdmin } from "./admin";
import { consumeRateLimit, RATE_LIMITS } from "./rateLimit";

const MIN_DONATION_PENCE = 1000;

const giftAidConfirmationsValidator = v.object({
  ukTaxpayer: v.boolean(),
  ownMoney: v.boolean(),
  noBenefit: v.boolean(),
  declaredAt: v.number(),
});

export interface CreateDraftArgs {
  clientHoldId: string;
  seatId: Id<"seats">;
  amountPence: number;
  giftAid: boolean;
  giftAidConfirmations?: {
    ukTaxpayer: boolean;
    ownMoney: boolean;
    noBenefit: boolean;
    declaredAt: number;
  };
  hideName: boolean;
  hideAmount: boolean;
  displayName?: string;
  recipientName?: string;
  avatarConfig?: string;
  marketingOptIn?: boolean;
  marketingConsentRecordedAt?: number;
  tag?: string;
  stripeSessionId: string;
  tributeText?: string;
}

export interface CreateDraftResult {
  donationId: Id<"donations">;
  tributeId: Id<"tributes"> | null;
}

// Serialisable draft creation. Verifies the visitor still holds the
// seat under their clientHoldId, inserts donations(status=pending) and
// (if a tribute was supplied) tributes(status=pending). userId is left
// undefined here — the webhook attaches one once Stripe confirms the
// payment and we know the donor's email.
export async function _createDraftForTest(
  ctx: MutationCtx,
  args: CreateDraftArgs,
): Promise<CreateDraftResult> {
  if (!Number.isInteger(args.amountPence)) {
    throw new ConvexError("amount_below_minimum");
  }

  await consumeRateLimit(
    ctx,
    `createDraft:${args.clientHoldId}`,
    RATE_LIMITS.createDraft,
  );

  const hold = await ctx.db
    .query("holds")
    .withIndex("by_seat", (q) => q.eq("seatId", args.seatId))
    .first();
  if (!hold || hold.clientHoldId !== args.clientHoldId) {
    throw new ConvexError("hold_required");
  }
  if (hold.expiresAt <= Date.now()) {
    throw new ConvexError("hold_expired");
  }

  // Per-seat minimum: the donor can bump upwards but cannot go below
  // the stand's tier price (£10 general, £25 standard, £50 premium).
  const seat = await ctx.db.get(args.seatId);
  if (!seat) {
    throw new ConvexError("hold_required");
  }
  const stand = STANDS.find((s) => s.id === seat.stand);
  const seatMinimum = stand?.pricePence ?? MIN_DONATION_PENCE;
  if (args.amountPence < seatMinimum) {
    throw new ConvexError("amount_below_minimum");
  }

  const donationId = await ctx.db.insert("donations", {
    clientHoldId: args.clientHoldId,
    seatId: args.seatId,
    amountPence: args.amountPence,
    currency: "GBP" as const,
    giftAid: args.giftAid,
    giftAidConfirmations: args.giftAidConfirmations,
    hideName: args.hideName,
    hideAmount: args.hideAmount,
    displayName: args.displayName,
    recipientName: args.recipientName,
    avatarConfig: args.avatarConfig,
    marketingOptIn: args.marketingOptIn,
    marketingConsentRecordedAt: args.marketingConsentRecordedAt,
    tag: args.tag,
    stripeSessionId: args.stripeSessionId,
    status: "pending" as const,
  });

  let tributeId: Id<"tributes"> | null = null;
  if (args.tributeText && args.tributeText.trim().length > 0) {
    const trimmed = args.tributeText.trim();
    const moderation = moderateTribute(trimmed);
    tributeId = await ctx.db.insert("tributes", {
      donationId,
      text: trimmed,
      status:
        moderation.decision === "approve"
          ? ("approved" as const)
          : ("pending" as const),
      profanityScore: moderation.score,
    });
  }

  return { donationId, tributeId };
}

// Internal — called from the createSession action after Stripe returns
// the Checkout Session id. Public donate flow always reaches here.
export const createDraft = internalMutation({
  args: {
    clientHoldId: v.string(),
    seatId: v.id("seats"),
    amountPence: v.number(),
    giftAid: v.boolean(),
    giftAidConfirmations: v.optional(giftAidConfirmationsValidator),
    hideName: v.boolean(),
    hideAmount: v.boolean(),
    displayName: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    avatarConfig: v.optional(v.string()),
    marketingOptIn: v.optional(v.boolean()),
    marketingConsentRecordedAt: v.optional(v.number()),
    tag: v.optional(v.string()),
    stripeSessionId: v.string(),
    tributeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await _createDraftForTest(ctx, args);
  },
});

// Public — read on the success page, keyed by Stripe session id from
// the return URL. Auth-gated: returns the full donation only to the
// donor who created it. Other callers (or anonymous) get null.
//
// This stops a leaked session_id (browser history, screenshots,
// referrer headers) from exposing the donor's name + Gift Aid status
// + amount + tribute references to a third party.
export const getBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const donation = await ctx.db
      .query("donations")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();
    if (!donation) return null;
    if (donation.userId !== userId) return null;
    return donation;
  },
});

// Public reactive aggregate for the campaign header. Numbers update
// live as webhooks complete. Bounded reads — at v1 scale (~1280 seats,
// few thousand donations) one pass is fine; if we outgrow this we
// denormalise into a counter doc per the Convex guidelines.
export const aggregateStats = query({
  args: {},
  handler: async (ctx) => {
    const seats = await ctx.db.query("seats").take(2000);
    const totalSeats = seats.length;
    const seatsBlue = seats.filter((s) => s.status === "taken").length;

    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);

    const supporters = paid.length;
    const raisedPence = paid.reduce((sum, d) => {
      const uplift = d.giftAid ? Math.floor(d.amountPence / 4) : 0;
      return sum + d.amountPence + uplift;
    }, 0);

    return { raisedPence, seatsBlue, supporters, totalSeats };
  },
});

// Admin-only Gift Aid export feed. Returns one row per paid donation
// where giftAid=true. The donor email is read from the auth users
// table. Display name comes from the donation row. The /admin/exports
// page formats this into CSV client-side.
// Admin-only: search paid donations by donor display name OR recipient
// name OR email. Case-insensitive substring match. Capped at 50 hits
// per query. Used by /admin/search to find James-Bond-tier jokes that
// slipped past moderation.
export const adminSearch = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    await requireAdmin(ctx);
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);
    const hits = paid.filter((d) => {
      const hay = [
        d.displayName ?? "",
        d.recipientName ?? "",
        d.donorEmail ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    const result = [] as Array<{
      donationId: Id<"donations">;
      amountPence: number;
      displayName: string | null;
      recipientName: string | null;
      hideName: boolean;
      hideAmount: boolean;
      email: string | null;
      tribute: { tributeId: Id<"tributes">; text: string; status: string } | null;
      seat: { stand: string; row: number; num: number } | null;
      createdAt: number;
    }>;
    for (const d of hits.slice(0, 50)) {
      const tribute = await ctx.db
        .query("tributes")
        .withIndex("by_donation", (q) => q.eq("donationId", d._id))
        .first();
      const seat = d.seatId ? await ctx.db.get(d.seatId) : null;
      result.push({
        donationId: d._id,
        amountPence: d.amountPence,
        displayName: d.displayName ?? null,
        recipientName: d.recipientName ?? null,
        hideName: d.hideName,
        hideAmount: d.hideAmount,
        email: d.donorEmail ?? null,
        tribute: tribute
          ? { tributeId: tribute._id, text: tribute.text, status: tribute.status }
          : null,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
        createdAt: d._creationTime,
      });
    }
    return result;
  },
});

// Admin override: edit a donor's displayName / recipientName / hide
// flags. Logged to adminAuditLog so we have a paper trail of every
// content moderation touch.
export const adminEditDonor = mutation({
  args: {
    donationId: v.id("donations"),
    displayName: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    hideName: v.optional(v.boolean()),
    hideAmount: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const patch: {
      displayName?: string;
      recipientName?: string;
      hideName?: boolean;
      hideAmount?: boolean;
    } = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.recipientName !== undefined)
      patch.recipientName = args.recipientName;
    if (args.hideName !== undefined) patch.hideName = args.hideName;
    if (args.hideAmount !== undefined) patch.hideAmount = args.hideAmount;
    await ctx.db.patch(args.donationId, patch);
    await logAdminAction(ctx, admin, {
      action: "donation.adminEdit",
      targetType: "donation",
      targetId: args.donationId,
    });
    return { editedBy: admin.email };
  },
});

// Admin-only export: donors who ticked the "stay in touch" marketing
// box on their donation. PECR-compliant: only donors who opted IN
// appear. Includes recordedAt so the charity has the consent timestamp
// for their records.
export const marketingOptInExport = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);
    const rows: Array<{
      donationDate: string;
      email: string | null;
      displayName: string | null;
      consentRecordedAt: number | null;
    }> = [];
    for (const donation of paid) {
      if (donation.marketingOptIn !== true) continue;
      const user = donation.userId ? await ctx.db.get(donation.userId) : null;
      const email = user?.email ?? donation.donorEmail ?? null;
      const date = new Date(donation._creationTime);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      rows.push({
        donationDate: `${yyyy}-${mm}-${dd}`,
        email,
        displayName: donation.displayName ?? null,
        consentRecordedAt: donation.marketingConsentRecordedAt ?? null,
      });
    }
    return rows;
  },
});

export const giftAidExport = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);
    const rows: Array<{
      donationDate: string;
      email: string | null;
      displayName: string | null;
      amountPence: number;
      upliftPence: number;
      stripePaymentIntentId: string | null;
    }> = [];
    for (const donation of paid) {
      if (!donation.giftAid) continue;
      const user = donation.userId ? await ctx.db.get(donation.userId) : null;
      const email = user?.email ?? donation.donorEmail ?? null;
      const date = new Date(donation._creationTime);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      rows.push({
        donationDate: `${yyyy}-${mm}-${dd}`,
        email,
        displayName: donation.displayName ?? null,
        amountPence: donation.amountPence,
        upliftPence: Math.floor(donation.amountPence / 4),
        stripePaymentIntentId: donation.stripePaymentIntentId ?? null,
      });
    }
    return rows;
  },
});

// Public read for the post-payment /thanks page. Stripe redirects the
// donor here with the session_id in the query; we look the donation up
// and surface a public-safe shape (no email, no Stripe ids, no Gift
// Aid confirmation timestamp). Returns null if the donation hasn't yet
// been marked paid by the webhook so the page can keep waiting.
export const getThanksBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();
    if (!donation || donation.status !== "paid") return null;

    const seat = donation.seatId ? await ctx.db.get(donation.seatId) : null;
    const seatPublic = seat
      ? {
          stand: seat.stand,
          row: seat.row,
          num: seat.num,
          slug: `${seat.stand}-${seat.row + 1}-${seat.num + 1}`,
        }
      : null;

    const tribute = await ctx.db
      .query("tributes")
      .withIndex("by_donation", (q) => q.eq("donationId", donation._id))
      .first();
    const tributePublic = tribute
      ? { text: tribute.text, status: tribute.status }
      : null;

    return {
      donationId: donation._id,
      amountPence: donation.hideAmount ? null : donation.amountPence,
      giftAid: donation.giftAid,
      displayName: donation.hideName ? null : (donation.displayName ?? null),
      seat: seatPublic,
      tribute: tributePublic,
    };
  },
});

interface MarkPaidArgs {
  stripeSessionId: string;
  paymentIntentId?: string;
  donorEmail?: string;
}

interface MarkPaidResult {
  donationId: Id<"donations"> | null;
  alreadyPaid: boolean;
  userId: Id<"users"> | null;
}

// Find-or-create the donor user by Stripe customer email. Stripe
// collects a verified email at checkout, so this is the safest place
// to attach a user to the donation. Convex Auth's user table accepts
// loose emails, and a returning donor magic-link signs into the same
// row by email.
async function findOrCreateUserByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Id<"users">> {
  const normalised = email.trim().toLowerCase();
  // Use the auth-provided "email" index instead of a filter scan —
  // critical once users grows past a few hundred.
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalised))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("users", { email: normalised });
}

// Serialisable webhook fan-out: flip donation to paid, mark seat taken,
// release the hold. Idempotent on second call (returns alreadyPaid:true).
// Receipt email is fired by a separate scheduled action so we keep the
// webhook fast (07 §8). Tested directly via convex-test.
export async function _markPaidForTest(
  ctx: MutationCtx,
  args: MarkPaidArgs,
): Promise<MarkPaidResult> {
  const donation = await ctx.db
    .query("donations")
    .withIndex("by_session", (q) =>
      q.eq("stripeSessionId", args.stripeSessionId),
    )
    .first();
  if (!donation) {
    return { donationId: null, alreadyPaid: false, userId: null };
  }
  if (donation.status === "paid") {
    return {
      donationId: donation._id,
      alreadyPaid: true,
      userId: donation.userId ?? null,
    };
  }

  // Attach a user record at the moment of payment confirmation. Stripe
  // is the source of truth for the donor's email here.
  let userId: Id<"users"> | null = donation.userId ?? null;
  if (!userId && args.donorEmail) {
    userId = await findOrCreateUserByEmail(ctx, args.donorEmail);
  }

  await ctx.db.patch(donation._id, {
    status: "paid" as const,
    stripePaymentIntentId: args.paymentIntentId,
    donorEmail: args.donorEmail
      ? args.donorEmail.trim().toLowerCase()
      : donation.donorEmail,
    userId: userId ?? undefined,
  });

  if (donation.seatId) {
    const seat = await ctx.db.get(donation.seatId);
    if (seat && seat.status !== "taken") {
      // Single-claim: flip the seat once. Subsequent webhook replays
      // are no-ops thanks to the alreadyPaid early-return above.
      await ctx.db.patch(seat._id, {
        status: "taken" as const,
        donationId: donation._id,
      });
    }
    const hold = await ctx.db
      .query("holds")
      .withIndex("by_seat", (q) => q.eq("seatId", donation.seatId!))
      .first();
    if (hold) {
      await ctx.db.delete(hold._id);
    }
  }

  return { donationId: donation._id, alreadyPaid: false, userId };
}

export const markPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    donorEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await _markPaidForTest(ctx, args);
    // Schedule the receipt email after the transaction commits. The
    // action checks receiptSentAt and bails on second invocation, so a
    // webhook replay won't double-send.
    if (result.donationId && !result.alreadyPaid) {
      await ctx.scheduler.runAfter(0, internal.email.sendReceipt, {
        donationId: result.donationId,
      });
    }
    return result;
  },
});

// Internal — used by the receipt email action to look up the donation.
export const getByIdInternal = internalQuery({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    return await ctx.db.get(donationId);
  },
});

// Internal — flag a donation's receipt as sent. Idempotent set.
export const markReceiptSent = internalMutation({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    await ctx.db.patch(donationId, { receiptSentAt: Date.now() });
  },
});

// Public — donor's own paid donations + linked tribute + seat
// coordinate. Used by /manage to show what they've claimed.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const donations = await ctx.db
      .query("donations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const result: Array<{
      donation: (typeof donations)[number];
      tribute: { _id: Id<"tributes">; text: string; status: string } | null;
      seat: { stand: string; row: number; num: number } | null;
    }> = [];

    for (const donation of donations) {
      const tribute = await ctx.db
        .query("tributes")
        .withIndex("by_donation", (q) => q.eq("donationId", donation._id))
        .first();
      const seat = donation.seatId ? await ctx.db.get(donation.seatId) : null;
      result.push({
        donation,
        tribute: tribute
          ? { _id: tribute._id, text: tribute.text, status: tribute.status }
          : null,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    return result;
  },
});

// Public — anonymous-friendly companion to listMine. /manage uses this
// when the donor hasn't signed in yet: it lists donations created from
// this browser via clientHoldId. Returns the same shape as listMine so
// the UI can render either source.
export const listByClient = query({
  args: { clientHoldId: v.string() },
  handler: async (ctx, { clientHoldId }) => {
    if (clientHoldId.length < 8) return [];

    const ownDonations = await ctx.db
      .query("donations")
      .withIndex("by_client", (q) => q.eq("clientHoldId", clientHoldId))
      .order("desc")
      .take(50);

    // Katie case (Adam, 1 Jun): a donor who bought two seats from two
    // different browser sessions (incognito reset, second device, etc.)
    // ends up with two different clientHoldIds but the SAME email from
    // Stripe. listByClient was only seeing one. If we can prove this
    // browser owns at least one donation, union in every paid donation
    // sharing that email so the donor can manage all seats from any
    // browser they paid on.
    const seenIds = new Set(ownDonations.map((d) => d._id));
    const emailUnion: typeof ownDonations = [];
    const seenEmails = new Set<string>();
    for (const d of ownDonations) {
      const email = d.donorEmail?.trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);
      const others = await ctx.db
        .query("donations")
        .filter((q) => q.eq(q.field("donorEmail"), email))
        .take(50);
      for (const o of others) {
        if (seenIds.has(o._id)) continue;
        seenIds.add(o._id);
        emailUnion.push(o);
      }
    }
    const donations = [...ownDonations, ...emailUnion].sort(
      (a, b) => b._creationTime - a._creationTime,
    );

    const result: Array<{
      donation: (typeof donations)[number];
      tribute: { _id: Id<"tributes">; text: string; status: string } | null;
      seat: { stand: string; row: number; num: number } | null;
    }> = [];

    for (const donation of donations) {
      const tribute = await ctx.db
        .query("tributes")
        .withIndex("by_donation", (q) => q.eq("donationId", donation._id))
        .first();
      const seat = donation.seatId ? await ctx.db.get(donation.seatId) : null;
      result.push({
        donation,
        tribute: tribute
          ? { _id: tribute._id, text: tribute.text, status: tribute.status }
          : null,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    return result;
  },
});

// Public — donor edits their own donation. Either auth+userId match
// OR a matching clientHoldId is sufficient. Status / amount / stripe
// ids stay immutable.
export const update = mutation({
  args: {
    donationId: v.id("donations"),
    clientHoldId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    hideName: v.optional(v.boolean()),
    hideAmount: v.optional(v.boolean()),
    avatarConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const donation = await ctx.db.get(args.donationId);
    if (!donation) throw new ConvexError("not_found");

    const userMatches = userId && donation.userId === userId;
    const clientMatches =
      args.clientHoldId &&
      args.clientHoldId.length >= 8 &&
      donation.clientHoldId === args.clientHoldId;
    if (!userMatches && !clientMatches) {
      throw new ConvexError(userId ? "forbidden" : "unauthenticated");
    }

    const patch: {
      displayName?: string;
      hideName?: boolean;
      hideAmount?: boolean;
      avatarConfig?: string;
    } = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.hideName !== undefined) patch.hideName = args.hideName;
    if (args.hideAmount !== undefined) patch.hideAmount = args.hideAmount;
    if (args.avatarConfig !== undefined) patch.avatarConfig = args.avatarConfig;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.donationId, patch);
    }
    return null;
  },
});

// Stripe webhook idempotency log. The unique-on-eventId behaviour is
// implemented as check-then-insert inside this mutation: a second
// insert with the same id throws event_already_processed, which the
// webhook httpAction translates into a clean 200. Tested directly.
export async function _recordEventForTest(
  ctx: MutationCtx,
  eventId: string,
): Promise<Id<"stripeEvents">> {
  const existing = await ctx.db
    .query("stripeEvents")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .first();
  if (existing) {
    throw new ConvexError("event_already_processed");
  }
  return await ctx.db.insert("stripeEvents", {
    eventId,
    receivedAt: Date.now(),
  });
}

export const recordEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    return await _recordEventForTest(ctx, eventId);
  },
});
