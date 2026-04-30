"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { STANDS } from "@/lib/stands";

function describeSeat(
  seat: { stand: string; row: number; num: number } | null,
): string {
  if (!seat) return "Seat pending";
  const stand = STANDS.find((s) => s.id === seat.stand);
  return `${stand?.name ?? seat.stand} · Row ${seat.row + 1}, Seat ${seat.num + 1}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    if (err.data === "forbidden") return "forbidden";
    if (err.data === "unauthenticated") return "unauthenticated";
    if (typeof err.data === "string") return err.data;
  }
  if (err instanceof Error) return err.message;
  return "Couldn't load the queue.";
}

export function ModerationQueue() {
  const auth = useConvexAuth();
  const tributes = useQuery(
    api.tributes.listForModeration,
    auth.isAuthenticated ? {} : "skip",
  );
  const approve = useMutation(api.tributes.adminApprove);
  const reject = useMutation(api.tributes.adminReject);
  const [busy, setBusy] = useState<Id<"tributes"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (auth.isLoading) {
    return <Wrapper>Loading…</Wrapper>;
  }

  if (!auth.isAuthenticated) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Sign in to moderate</h1>
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

  if (tributes === undefined) {
    return <Wrapper>Loading the queue…</Wrapper>;
  }

  // useQuery throws via the boundary in dev; tributes will be the
  // returned array when the user is permitted. If we land here as an
  // empty array, the queue is genuinely clear.

  const onAction = async (
    tributeId: Id<"tributes">,
    action: "approve" | "reject",
  ) => {
    setBusy(tributeId);
    setError(null);
    try {
      if (action === "approve") {
        await approve({ tributeId });
      } else {
        await reject({ tributeId });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (tributes.length === 0) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Moderation queue</h1>
        <p className="text-white/75">
          Nothing to look at. Pending tributes pile up here when the profanity
          filter quarantines them.
        </p>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Moderation queue</h1>
        <p className="text-sm text-white/70">
          Worst-first. Approve to publish on the wall; reject to hide
          permanently. The donor can edit their tribute at any time; edits go
          back to pending.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-amber-300/20 px-3 py-2 text-sm text-amber-200"
        >
          {error === "forbidden"
            ? "You're not on the admin allowlist. Set ADMIN_EMAILS in Convex env."
            : error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {tributes.map((entry) => (
          <li
            key={entry.tributeId}
            data-testid={`moderation-row-${entry.tributeId}`}
            className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-3 rounded-xl p-4 ring-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 text-xs text-white/60">
              <span>{describeSeat(entry.seat)}</span>
              <span>
                Score{" "}
                <strong className="text-bwf-gold">
                  {entry.profanityScore}
                </strong>{" "}
                · {entry.status}
              </span>
            </div>
            <p className="text-base text-white">
              {entry.displayName ? (
                <span className="text-bwf-pale block text-xs tracking-widest uppercase">
                  {entry.displayName}
                </span>
              ) : null}
              {entry.text}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onAction(entry.tributeId, "approve")}
                disabled={busy === entry.tributeId}
                className="font-display bg-bwf-blue hover:bg-bwf-blue-light rounded-full px-4 py-2 text-xs tracking-wider text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => onAction(entry.tributeId, "reject")}
                disabled={busy === entry.tributeId}
                className="font-display ring-bwf-blue/40 rounded-full px-4 py-2 text-xs tracking-wider text-white/80 ring-1 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Moderation queue"
      className="bg-bwf-blue mx-auto flex max-w-3xl flex-col gap-5 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
