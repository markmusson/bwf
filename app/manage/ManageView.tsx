"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useClientHoldId } from "@/lib/clientHoldId";
import { ManageDonationCard } from "./ManageDonationCard";

type Entry = {
  donation: Doc<"donations">;
  tribute: { _id: Id<"tributes">; text: string; status: string } | null;
  seat: { stand: string; row: number; num: number } | null;
};

export function ManageView() {
  const auth = useConvexAuth();
  const clientHoldId = useClientHoldId();

  const fromAuth = useQuery(
    api.donations.listMine,
    auth.isAuthenticated ? {} : "skip",
  ) as Entry[] | undefined;
  const fromClient = useQuery(
    api.donations.listByClient,
    clientHoldId ? { clientHoldId } : "skip",
  ) as Entry[] | undefined;

  if (auth.isLoading || (clientHoldId === null && !auth.isAuthenticated)) {
    return (
      <Wrapper>
        <p className="text-white/70">Loading…</p>
      </Wrapper>
    );
  }

  const merged: Entry[] = [];
  const seen = new Set<string>();
  for (const e of fromAuth ?? []) {
    if (!seen.has(e.donation._id)) {
      merged.push(e);
      seen.add(e.donation._id);
    }
  }
  for (const e of fromClient ?? []) {
    if (!seen.has(e.donation._id)) {
      merged.push(e);
      seen.add(e.donation._id);
    }
  }
  const paid = merged.filter((e) => e.donation.status === "paid");

  if (paid.length === 0) {
    return (
      <Wrapper>
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl">Manage your seats</h1>
          <p className="text-white/75">
            Donations made from this browser show up here automatically. To see
            donations made on another device, sign in by email.
          </p>
        </header>

        {!auth.isAuthenticated ? (
          <Link
            href="/signin"
            className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-5 py-3 text-sm tracking-wider text-white"
          >
            Sign in by email
          </Link>
        ) : null}

        <p className="text-white/75">
          No paid donations yet. Pick a seat at Edgbaston to start.
        </p>
        <Link
          href="/stadium"
          className="ring-bwf-pale/40 font-display self-start rounded-full px-5 py-3 text-sm tracking-wider text-white ring-1 hover:bg-white/5"
        >
          To the stadium
        </Link>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Your seats</h1>
        <p className="text-sm text-white/70">
          Edit your display name, hide flags, or your tribute. Tribute edits are
          re-checked by the moderation queue before they reappear on the wall.
        </p>
        {!auth.isAuthenticated ? (
          <p className="text-xs text-white/55">
            Showing donations made from this browser.{" "}
            <Link href="/signin" className="text-bwf-pale hover:text-white">
              Sign in
            </Link>{" "}
            to see seats from other devices.
          </p>
        ) : null}
      </header>

      <ul className="flex flex-col gap-4">
        {paid.map((entry) => (
          <li key={entry.donation._id}>
            <ManageDonationCard
              donationId={entry.donation._id}
              displayName={entry.donation.displayName ?? ""}
              hideName={entry.donation.hideName}
              hideAmount={entry.donation.hideAmount}
              amountPence={entry.donation.amountPence}
              giftAid={entry.donation.giftAid}
              tributeText={entry.tribute?.text ?? ""}
              tributeStatus={entry.tribute?.status ?? null}
              seat={entry.seat}
              clientHoldId={clientHoldId ?? undefined}
            />
          </li>
        ))}
      </ul>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Manage your seats"
      className="bg-bwf-blue mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
