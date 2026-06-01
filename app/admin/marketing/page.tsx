import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingExport } from "./MarketingExport";

export const metadata: Metadata = {
  title: "Marketing opt-ins",
};

export default function MarketingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingExport />
    </Suspense>
  );
}
