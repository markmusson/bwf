import type { Metadata } from "next";
import { Suspense } from "react";
import { PostalEntries } from "./PostalEntries";

export const metadata: Metadata = {
  title: "Postal entries — Blue for Bob 2026 admin",
};

export default function PostalEntriesPage() {
  return (
    <Suspense fallback={null}>
      <PostalEntries />
    </Suspense>
  );
}
