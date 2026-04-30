"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { formatGbpPence } from "@/lib/money";

interface Props {
  sessionId: string | undefined;
}

export function CompleteView({ sessionId }: Props) {
  const donation = useQuery(
    api.donations.getBySession,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );

  if (!sessionId) {
    return (
      <Layout>
        <h1 className="text-3xl font-semibold tracking-tight">
          Missing session id
        </h1>
        <p className="text-white/70">
          We can&apos;t find your donation. If you&apos;ve just paid, the Stripe
          redirect should include a <code>session_id</code>.
        </p>
        <Link
          href="/stadium"
          className="bg-bwf-blue hover:bg-bwf-accent self-start rounded-full px-5 py-2 text-sm font-medium text-white transition-colors"
        >
          Back to the stadium
        </Link>
      </Layout>
    );
  }

  if (donation === undefined) {
    return (
      <Layout>
        <p className="text-white/70" data-testid="loading">
          Loading your donation…
        </p>
      </Layout>
    );
  }

  if (donation === null) {
    return (
      <Layout>
        <h1 className="text-3xl font-semibold tracking-tight">
          We couldn&apos;t find that donation
        </h1>
        <p className="text-white/70">
          The session id didn&apos;t match anything on our side. If you just
          paid, hold tight and refresh — Stripe&apos;s webhook is on the way.
        </p>
      </Layout>
    );
  }

  const isPaid = donation.status === "paid";
  const total = donation.amountPence;

  return (
    <Layout>
      {isPaid ? (
        <>
          <p className="text-bwf-pale text-xs tracking-wide uppercase">
            Seat is blue
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Thank you for supporting the Bob Willis Fund.
          </h1>
          <p className="text-lg text-white/80">
            We&apos;ve recorded your donation of{" "}
            <strong>{formatGbpPence(total)}</strong>. A receipt is on its way to
            your inbox.
          </p>
          <div className="ring-bwf-blue/30 rounded-xl bg-white/5 p-5 ring-1">
            <h2 className="text-base font-semibold">
              Want to enter the prize draw?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Free, separate from your donation, and we keep your Gift Aid
              valid. Postal entries also accepted at the address on the prize
              T&amp;Cs page.
            </p>
            <button
              type="button"
              disabled
              className="bg-bwf-blue/40 mt-4 cursor-not-allowed rounded-full px-5 py-2 text-sm font-medium text-white"
              data-testid="prize-optin-button"
            >
              Enter the prize draw (free) — coming soon
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">
            Processing your donation
          </h1>
          <p className="text-white/70">
            Your payment is going through. This page will update the moment
            Stripe confirms — no need to refresh.
          </p>
        </>
      )}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Donation complete"
      className="bg-bwf-deep mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-6 py-12 text-white"
    >
      {children}
    </section>
  );
}
