"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
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

export function SearchView() {
  const auth = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    auth.isAuthenticated ? {} : "skip",
  );
  const [query, setQuery] = useState("");
  const results = useQuery(
    api.donations.adminSearch,
    isAdmin === true && query.trim().length >= 2 ? { q: query } : "skip",
  );

  if (auth.isLoading || (auth.isAuthenticated && isAdmin === undefined)) {
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

  if (isAdmin === false) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Not authorised</h1>
        <p className="text-white/70">
          You&apos;re signed in, but your email isn&apos;t on the BWF admin
          allowlist.
        </p>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Donor search</h1>
        <p className="text-sm text-white/70">
          Find a paid donation by donor name, dedication recipient, or email.
          Use this to edit a tribute or hide a name after the fact.
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="James Bond, Bob, sarah@…"
        className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
      />

      {query.trim().length < 2 ? (
        <p className="text-xs text-white/55">Type at least 2 characters.</p>
      ) : results === undefined ? (
        <p className="text-sm text-white/65">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-white/65">No matches for “{query}”.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((entry) => (
            <DonorRow key={entry.donationId} entry={entry} />
          ))}
        </ul>
      )}
    </Wrapper>
  );
}

interface DonorEntry {
  donationId: Id<"donations">;
  amountPence: number;
  displayName: string | null;
  recipientName: string | null;
  hideName: boolean;
  hideAmount: boolean;
  email: string | null;
  tribute: { tributeId: Id<"tributes">; text: string; status: string } | null;
  seat: { stand: string; row: number; num: number } | null;
  createdAt: number;
}

function DonorRow({ entry }: { entry: DonorEntry }) {
  const editDonor = useMutation(api.donations.adminEditDonor);
  const editText = useMutation(api.tributes.adminEditText);
  const [displayName, setDisplayName] = useState(entry.displayName ?? "");
  const [recipientName, setRecipientName] = useState(entry.recipientName ?? "");
  const [hideName, setHideName] = useState(entry.hideName);
  const [tributeText, setTributeText] = useState(entry.tribute?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await editDonor({
        donationId: entry.donationId,
        displayName,
        recipientName,
        hideName,
      });
      if (entry.tribute && tributeText !== entry.tribute.text) {
        await editText({ tributeId: entry.tribute.tributeId, text: tributeText });
      }
      setSaved(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save edits.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-3 rounded-xl p-4 ring-1">
      <header className="flex flex-wrap items-baseline justify-between gap-3 text-xs text-white/60">
        <span>{describeSeat(entry.seat)}</span>
        <span>{entry.email ?? "(no email)"}</span>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="ring-bwf-blue/40 rounded bg-white/10 px-2 py-1.5 text-sm text-white ring-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Dedicated to
          <input
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            className="ring-bwf-blue/40 rounded bg-white/10 px-2 py-1.5 text-sm text-white ring-1"
          />
        </label>
      </div>
      {entry.tribute ? (
        <label className="flex flex-col gap-1 text-xs text-white/70">
          Tribute ({entry.tribute.status})
          <textarea
            value={tributeText}
            onChange={(event) => setTributeText(event.target.value)}
            rows={3}
            className="ring-bwf-blue/40 rounded bg-white/10 px-2 py-1.5 text-sm text-white ring-1"
          />
        </label>
      ) : null}
      <label className="flex items-center gap-2 text-xs text-white/75">
        <input
          type="checkbox"
          checked={hideName}
          onChange={(event) => setHideName(event.target.checked)}
        />
        Hide donor name from the wall + card
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light rounded-full px-4 py-2 text-xs tracking-wider text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved ? <span className="text-xs text-white/55">Saved.</span> : null}
        {error ? (
          <span role="alert" className="text-xs text-amber-300">
            {error}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Donor search"
      className="bg-bwf-blue mx-auto flex max-w-3xl flex-col gap-5 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
