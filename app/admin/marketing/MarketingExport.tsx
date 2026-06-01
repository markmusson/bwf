"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { formatMarketingCsv } from "@/lib/marketingCsv";

export function MarketingExport() {
  const auth = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    auth.isAuthenticated ? {} : "skip",
  );
  const rows = useQuery(
    api.donations.marketingOptInExport,
    isAdmin === true ? {} : "skip",
  );

  if (auth.isLoading || (auth.isAuthenticated && isAdmin === undefined)) {
    return <Wrapper>Loading…</Wrapper>;
  }

  if (!auth.isAuthenticated) {
    return (
      <Wrapper>
        <h1 className="font-display text-3xl">Sign in to export</h1>
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

  if (rows === undefined) {
    return <Wrapper>Loading the export…</Wrapper>;
  }

  const onDownload = () => {
    const csv = formatMarketingCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bwf-marketing-optins-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Marketing opt-ins</h1>
        <p className="text-sm text-white/70">
          {rows.length} donors ticked the &ldquo;stay in touch&rdquo; box.
        </p>
        <p className="text-xs text-white/55">
          PECR-compliant: only opt-ins appear. Consent timestamps are included
          so you can prove provenance to the ICO if challenged.
        </p>
      </header>

      <button
        type="button"
        onClick={onDownload}
        disabled={rows.length === 0}
        className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-5 py-3 text-sm tracking-wider text-white disabled:opacity-40"
      >
        Download CSV
      </button>

      <ul className="ring-bwf-blue/20 flex flex-col gap-1 rounded-lg bg-black/20 p-3 text-xs ring-1">
        {rows.slice(0, 20).map((row, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-white/80">{row.email ?? "(no email)"}</span>
            <span className="text-white/55">{row.donationDate}</span>
          </li>
        ))}
        {rows.length > 20 ? (
          <li className="text-white/50">
            …and {rows.length - 20} more in the CSV.
          </li>
        ) : null}
      </ul>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Marketing opt-in export"
      className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
