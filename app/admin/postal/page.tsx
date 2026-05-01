import type { Metadata } from "next";
import { Suspense } from "react";
import { PostalEntries } from "./PostalEntries";

export const metadata: Metadata = {
  title: "Postal entries",
};

export default function PostalEntriesPage() {
  return (
    <Suspense fallback={null}>
      <PostalEntries />
    </Suspense>
  );
}
