import { ConvexError, v } from "convex/values";
import { Resend } from "resend";
import { formatReceipt } from "../lib/email/receipt";
import { formatSeatSlug } from "../lib/seatSlug";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

// Donor lookup used by sendReceipt to fetch email + name. Internal —
// returns null when the user has been deleted (rare; receipt simply
// doesn't fire).
export const getDonor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      email: user.email ?? null,
      name: user.name ?? null,
    };
  },
});

// Receipt email — scheduled by donations.markPaid. Idempotent: reads
// donations.receiptSentAt and bails if already sent. Keeps the webhook
// fan-out fast; the Resend network call lives here.
export const sendReceipt = internalAction({
  args: { donationId: v.id("donations") },
  handler: async (
    ctx,
    { donationId },
  ): Promise<{ sent: boolean; reason?: string }> => {
    const donation = await ctx.runQuery(internal.donations.getByIdInternal, {
      donationId,
    });
    if (!donation) return { sent: false, reason: "not_found" };
    if (donation.status !== "paid") return { sent: false, reason: "not_paid" };
    if (donation.receiptSentAt) return { sent: false, reason: "already_sent" };

    const donorEmail = donation.donorEmail ?? null;
    let donorName: string | null = null;
    if (donation.userId) {
      const donor = await ctx.runQuery(internal.email.getDonor, {
        userId: donation.userId,
      });
      donorName = donor?.name ?? null;
    }
    const email = donorEmail ?? null;
    if (!email) return { sent: false, reason: "no_email" };
    const donor = { email, name: donorName };

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) throw new ConvexError("resend_not_configured");
    const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

    // Receipt URLs derive from SITE_URL so they track whatever domain
    // we're on (bwf-seven.vercel.app pre-cutover, blue.bobwillisfund.org
    // after). Falls back to the lib default if SITE_URL is missing —
    // shouldn't happen on prod but keeps tests and dev sane.
    const siteUrl = process.env.SITE_URL;
    let shareImageUrl: string | undefined;
    if (siteUrl && donation.seatId) {
      const seat = await ctx.runQuery(internal.seats.getByIdInternal, {
        seatId: donation.seatId,
      });
      if (seat) {
        const slug = formatSeatSlug({
          stand: seat.stand,
          row: seat.row,
          num: seat.num,
        });
        shareImageUrl = `${siteUrl}/seat/${slug}/opengraph-image`;
      }
    }
    const receiptOptions = siteUrl
      ? {
          fundraisingPageUrl: `${siteUrl}/stadium`,
          managePageUrl: `${siteUrl}/manage`,
          ...(shareImageUrl ? { shareImageUrl } : {}),
        }
      : {};
    const { subject, html, text } = formatReceipt(
      donation,
      {
        email: donor.email,
        name: donor.name ?? donation.displayName ?? undefined,
      },
      receiptOptions,
    );

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: donor.email,
      subject,
      html,
      text,
    });

    if (result.error) {
      throw new ConvexError(`resend_error:${result.error.message}`);
    }

    await ctx.runMutation(internal.donations.markReceiptSent, { donationId });
    return { sent: true };
  },
});
