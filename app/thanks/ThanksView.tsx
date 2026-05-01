"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";

function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds.toFixed(0)}` : `£${pounds.toFixed(2)}`;
}

export function ThanksView() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const data = useQuery(
    api.donations.getThanksBySession,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );

  if (!sessionId) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">
          Couldn&apos;t find your donation
        </h1>
        <p className="text-sm text-white/70">
          The Stripe redirect didn&apos;t carry a session id. If you just paid,
          check your inbox for a receipt — your seat is safely recorded.
        </p>
        <Link
          href="/stadium"
          className="bg-bwf-pale text-bwf-navy font-display self-start rounded-full px-5 py-2 text-sm tracking-wider uppercase"
        >
          Back to the stadium
        </Link>
      </Wrapper>
    );
  }

  if (data === undefined || data === null) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">
          Confirming your payment with Stripe…
        </h1>
        <p className="text-sm text-white/70">
          This usually takes a second or two. Don&apos;t close the tab —
          we&apos;re waiting for the webhook to confirm.
        </p>
      </Wrapper>
    );
  }

  const name = data.displayName ?? null;

  return (
    <Wrapper>
      <header className="flex flex-col gap-1 text-center">
        <p className="text-bwf-pale text-xs tracking-widest uppercase">
          Donation confirmed
        </p>
        <h1 className="font-display text-3xl">
          {name ? `Thanks, ${name}.` : "Thanks for your donation."}
        </h1>
        {data.seat ? (
          <p className="text-sm text-white/70">
            Your seat is now{" "}
            <span className="text-bwf-pale">
              blue for Bob — {data.seat.slug}
            </span>
            .
          </p>
        ) : null}
      </header>

      <div className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-3 rounded-2xl p-6 ring-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-display text-lg">{name ?? "Anonymous"}</span>
          {data.amountPence !== null ? (
            <span className="text-bwf-pale text-sm">
              {formatGBP(data.amountPence)}
              {data.giftAid ? " · Gift Aid" : ""}
            </span>
          ) : null}
        </div>
        {data.tribute ? (
          data.tribute.status === "approved" ? (
            <p className="text-base text-white/90">{data.tribute.text}</p>
          ) : (
            <p className="text-sm text-amber-200/90">
              Your tribute is being reviewed before it goes on the wall.
            </p>
          )
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {data.seat ? (
          <Link
            href={`/seat/${data.seat.slug}`}
            className="bg-bwf-pale text-bwf-navy font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase"
          >
            Share this seat
          </Link>
        ) : null}
        <Link
          href="/wall"
          className="ring-bwf-pale/40 font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase ring-1 hover:bg-white/10"
        >
          See the wall
        </Link>
        <Link
          href="/manage"
          className="ring-bwf-pale/40 font-display rounded-full px-5 py-2 text-sm tracking-wider uppercase ring-1 hover:bg-white/10"
        >
          Manage my donation
        </Link>
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Donation confirmation"
      className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 text-white"
    >
      {children}
    </section>
  );
}
