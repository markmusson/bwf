"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { formatGiftAidCsv } from "@/lib/giftAidCsv";

export function GiftAidExport() {
  const auth = useConvexAuth();
  const rows = useQuery(
    api.donations.giftAidExport,
    auth.isAuthenticated ? {} : "skip",
  );

  if (auth.isLoading) {
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

  if (rows === undefined) {
    return <Wrapper>Loading the export…</Wrapper>;
  }

  const onDownload = () => {
    const csv = formatGiftAidCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bwf-gift-aid-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalAmount = rows.reduce((sum, r) => sum + r.amountPence, 0);
  const totalUplift = rows.reduce((sum, r) => sum + r.upliftPence, 0);

  return (
    <Wrapper>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Gift Aid export</h1>
        <p className="text-sm text-white/70">
          {rows.length} donations · £{(totalAmount / 100).toFixed(2)} eligible ·
          £{(totalUplift / 100).toFixed(2)} uplift to claim
        </p>
        <p className="text-xs text-white/55">
          Address fields aren&apos;t collected at v1. Match donors to your CRM
          before submitting the HMRC R68 schedule.
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
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Gift Aid export"
      className="bg-bwf-blue mx-auto flex max-w-2xl flex-col gap-5 px-6 py-10 text-white"
    >
      {children}
    </section>
  );
}
