import { query } from "./_generated/server";
import { requireAdmin } from "./admin";

// Admin-only campaign snapshot. Single round-trip: counters + recent
// donations + recent audit-log entries. Bounded reads — fine at v1
// scale (a few thousand donations / actions).

export interface AdminDashboard {
  raisedPence: number;
  raisedWithUpliftPence: number;
  paidDonations: number;
  giftAidDonations: number;
  seatsBlue: number;
  totalSeats: number;
  tributesApproved: number;
  tributesPending: number;
  tributesRejected: number;
  prizeEntries: number;
  recentDonations: Array<{
    donationId: string;
    amountPence: number;
    giftAid: boolean;
    displayName: string | null;
    createdAt: number;
    seat: { stand: string; row: number; num: number } | null;
  }>;
  recentAuditLog: Array<{
    action: string;
    actorEmail: string;
    targetId: string;
    at: number;
  }>;
}

export const dashboard = query({
  args: {},
  handler: async (ctx): Promise<AdminDashboard> => {
    await requireAdmin(ctx);

    const seats = await ctx.db.query("seats").take(2000);
    const seatsBlue = seats.filter((s) => s.status === "taken").length;

    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);

    let raisedPence = 0;
    let raisedWithUpliftPence = 0;
    let giftAidDonations = 0;
    for (const d of paid) {
      raisedPence += d.amountPence;
      const uplift = d.giftAid ? Math.floor(d.amountPence / 4) : 0;
      raisedWithUpliftPence += d.amountPence + uplift;
      if (d.giftAid) giftAidDonations += 1;
    }

    const tributes = await ctx.db.query("tributes").take(5000);
    const tributesApproved = tributes.filter(
      (t) => t.status === "approved",
    ).length;
    const tributesPending = tributes.filter(
      (t) => t.status === "pending",
    ).length;
    const tributesRejected = tributes.filter(
      (t) => t.status === "rejected",
    ).length;

    const entries = await ctx.db.query("prizeEntries").take(5000);

    const recent = paid
      .slice()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 10);
    const recentDonations: AdminDashboard["recentDonations"] = [];
    for (const d of recent) {
      const seat = d.seatId ? await ctx.db.get(d.seatId) : null;
      recentDonations.push({
        donationId: d._id,
        amountPence: d.amountPence,
        giftAid: d.giftAid,
        displayName: d.hideName ? null : (d.displayName ?? null),
        createdAt: d._creationTime,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    const log = await ctx.db.query("adminAuditLog").order("desc").take(10);
    const recentAuditLog = log.map((l) => ({
      action: l.action,
      actorEmail: l.actorEmail,
      targetId: l.targetId,
      at: l._creationTime,
    }));

    return {
      raisedPence,
      raisedWithUpliftPence,
      paidDonations: paid.length,
      giftAidDonations,
      seatsBlue,
      totalSeats: seats.length,
      tributesApproved,
      tributesPending,
      tributesRejected,
      prizeEntries: entries.length,
      recentDonations,
      recentAuditLog,
    };
  },
});
