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
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-bwf-blue flex h-16 w-16 items-center justify-center rounded-full">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-8 w-8">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-display text-[30px] font-black tracking-wider uppercase">
          Seat is blue!
        </h1>
        <p className="text-[13px] leading-relaxed text-white/65">
          Thank you for supporting the Bob Willis Fund. Your donation helps fund
          life-saving prostate cancer research. Bob would be proud.
        </p>

        {data.seat ? (
          <div className="ring-bwf-blue/25 font-display my-2 w-full rounded-lg bg-[rgba(0,133,202,0.14)] px-4 py-3 text-left text-[13px] font-bold tracking-[0.5px] text-[var(--color-bwf-blue-light)] uppercase ring-1">
            <div>
              {data.seat.stand.replace(/^./, (c) => c.toUpperCase())} Stand —
              Row {data.seat.row + 1}, Seat {data.seat.num + 1}
            </div>
            {data.amountPence !== null ? (
              <div>
                {formatGBP(data.amountPence)}
                {data.giftAid ? " · Gift Aid" : ""} · {name ?? "Anonymous"}
              </div>
            ) : null}
          </div>
        ) : null}

        {data.tribute && data.tribute.status === "pending" ? (
          <p className="text-xs text-amber-200/85">
            Your tribute is being reviewed before it goes on the wall.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {data.seat ? (
          <Link
            href={`/seat/${data.seat.slug}`}
            className="bg-bwf-blue hover:bg-bwf-blue-light font-display w-full rounded-lg px-6 py-3.5 text-center text-[18px] font-black tracking-[1px] text-white uppercase transition-colors"
          >
            Share this seat
          </Link>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/wall"
            className="font-display rounded-lg border border-white/15 px-4 py-2.5 text-center text-[13px] font-bold tracking-[0.5px] text-white/65 uppercase hover:border-[var(--color-bwf-blue)] hover:text-white"
          >
            See the wall
          </Link>
          <Link
            href="/manage"
            className="font-display rounded-lg border border-white/15 px-4 py-2.5 text-center text-[13px] font-bold tracking-[0.5px] text-white/65 uppercase hover:border-[var(--color-bwf-blue)] hover:text-white"
          >
            Manage donation
          </Link>
        </div>
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
