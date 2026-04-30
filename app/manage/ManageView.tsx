"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { ManageDonationCard } from "./ManageDonationCard";

export function ManageView() {
  const auth = useConvexAuth();
  const donations = useQuery(api.donations.listMine);

  if (auth.isLoading) {
    return (
      <Wrapper>
        <p className="text-white/70">Loading…</p>
      </Wrapper>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Sign in to manage your seats</h1>
        <p className="text-white/75">
          We&apos;ll send you a magic link. No passwords.
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

  if (donations === undefined) {
    return (
      <Wrapper>
        <p className="text-white/70">Loading your seats…</p>
      </Wrapper>
    );
  }

  const paid = donations.filter((d) => d.donation.status === "paid");

  if (paid.length === 0) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">No seats yet</h1>
        <p className="text-white/75">
          Pick a seat at Edgbaston, then come back here to manage your tribute
          and display name.
        </p>
        <Link
          href="/stadium"
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-5 py-3 text-sm tracking-wider text-white"
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
