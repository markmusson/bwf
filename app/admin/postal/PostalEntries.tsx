"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";

function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    if (typeof err.data === "string") return err.data;
  }
  if (err instanceof Error) return err.message;
  return "Couldn't add the entry.";
}

export function PostalEntries() {
  const auth = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    auth.isAuthenticated ? {} : "skip",
  );
  const rows = useQuery(
    api.prizeDraw.adminListPostalEntries,
    isAdmin === true ? {} : "skip",
  );
  const add = useMutation(api.prizeDraw.adminAddPostalEntry);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.isLoading || (auth.isAuthenticated && isAdmin === undefined)) {
    return <Wrapper>Loading…</Wrapper>;
  }

  if (!auth.isAuthenticated) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Sign in to admin</h1>
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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await add({ name, address });
      setName("");
      setAddress("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Postal entries</h1>
        <p className="text-sm text-white/70">
          Free entries arriving by post. Counted equally with online opt-ins
          when the prize draw is run.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] tracking-[1.5px] text-white/60 uppercase">
            Name
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-[10px] tracking-[1.5px] text-white/60 uppercase">
            Address
          </span>
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-amber-300/20 px-3 py-2 text-sm text-amber-200"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-5 py-3 text-sm tracking-wider text-white disabled:opacity-50"
        >
          Add entry
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Recent</h2>
        {rows === undefined ? (
          <p className="text-sm text-white/60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-white/60">No postal entries yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <li
                key={row.postalEntryId}
                className="bg-bwf-navy ring-bwf-blue/30 flex flex-col gap-1 rounded-lg p-3 ring-1"
              >
                <span className="font-display">{row.name}</span>
                <span className="text-xs whitespace-pre-line text-white/65">
                  {row.address}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Postal entries"
      className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
