"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

export function AdminDashboard() {
  const auth = useConvexAuth();
  const data = useQuery(
    api.adminDashboard.dashboard,
    auth.isAuthenticated ? {} : "skip",
  );

  if (auth.isLoading) {
    return <Wrapper>Loading…</Wrapper>;
  }

  if (!auth.isAuthenticated) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Sign in to admin</h1>
        <p className="text-white/70">
          Admin pages require a magic-link sign-in to a permitted email.
        </p>
        <Link
          href="/signin"
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-5 py-3 text-sm tracking-wider text-white"
        >
          Sign in
        </Link>
      </Wrapper>
    );
  }

  if (data === undefined) {
    return <Wrapper>Loading the dashboard…</Wrapper>;
  }

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Admin</h1>
        <p className="text-sm text-white/70">
          Snapshot of the BWF Virtual Seats campaign.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card label="Raised">
          <div>{formatGBP(data.raisedPence)} raised</div>
          <div className="text-bwf-pale text-xs">
            {formatGBP(data.raisedWithUpliftPence)} with Gift Aid
          </div>
        </Card>
        <Card label="Donations">
          <div>{data.paidDonations} paid</div>
          <div className="text-bwf-pale text-xs">
            {data.giftAidDonations} Gift Aid
          </div>
        </Card>
        <Card label="Seats">
          <div>
            {data.seatsBlue} / {data.totalSeats} seats blue
          </div>
        </Card>
        <Card label="Tributes">
          <div>{data.tributesApproved} approved</div>
          <div className="text-bwf-pale text-xs">
            {data.tributesPending} pending · {data.tributesRejected} rejected
          </div>
        </Card>
        <Card label="Prize draw">
          <div>{data.prizeEntries} entries</div>
        </Card>
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/admin/moderation"
          className="bg-bwf-pale text-bwf-navy font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Moderation queue
        </Link>
        <Link
          href="/admin/exports"
          className="bg-bwf-pale text-bwf-navy font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Gift Aid export
        </Link>
        <Link
          href="/admin/postal"
          className="bg-bwf-pale text-bwf-navy font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Postal entries
        </Link>
      </nav>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Recent donations</h2>
        {data.recentDonations.length === 0 ? (
          <p className="text-sm text-white/60">No paid donations yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.recentDonations.map((d) => (
              <li
                key={d.donationId}
                className="bg-bwf-navy ring-bwf-blue/30 flex flex-wrap items-baseline justify-between gap-3 rounded-lg p-3 ring-1"
              >
                <span>{d.displayName ?? "Anonymous"}</span>
                <span className="text-bwf-pale text-xs">
                  {formatGBP(d.amountPence)}
                  {d.giftAid ? " · Gift Aid" : ""} · {formatTime(d.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Recent admin actions</h2>
        {data.recentAuditLog.length === 0 ? (
          <p className="text-sm text-white/60">No actions logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.recentAuditLog.map((entry, i) => (
              <li
                key={`${entry.at}-${i}`}
                className="bg-bwf-navy ring-bwf-blue/30 flex flex-wrap items-baseline justify-between gap-3 rounded-lg p-3 ring-1"
              >
                <span>
                  <span className="font-display text-xs tracking-widest uppercase">
                    {entry.action}
                  </span>{" "}
                  · {entry.actorEmail}
                </span>
                <span className="text-bwf-pale text-xs">
                  {formatTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Wrapper>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-1 rounded-xl p-4 ring-1">
      <span className="font-display text-[10px] tracking-[1.5px] text-white/55 uppercase">
        {label}
      </span>
      <div className="font-display text-lg text-white">{children}</div>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Admin dashboard"
      className="bg-bwf-blue mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
