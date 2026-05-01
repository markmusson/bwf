import type { Metadata } from "next";
import { Suspense } from "react";
import { GiftAidExport } from "./GiftAidExport";

export const metadata: Metadata = {
  title: "Gift Aid export",
};

export default function ExportsPage() {
  return (
    <Suspense fallback={null}>
      <GiftAidExport />
    </Suspense>
  );
}
