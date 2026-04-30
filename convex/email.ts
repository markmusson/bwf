import { ConvexError, v } from "convex/values";
import { Resend } from "resend";
import { formatReceipt } from "../lib/email/receipt";
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

    const donor = await ctx.runQuery(internal.email.getDonor, {
      userId: donation.userId,
    });
    if (!donor?.email) return { sent: false, reason: "no_email" };

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) throw new ConvexError("resend_not_configured");
    const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

    const { subject, html, text } = formatReceipt(donation, {
      email: donor.email,
      name: donor.name ?? donation.displayName ?? undefined,
    });

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
