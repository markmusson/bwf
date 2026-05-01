import type { Metadata } from "next";
import { Suspense } from "react";
import { ThanksView } from "./ThanksView";

export const metadata: Metadata = {
  title: "Thanks — Blue for Bob 2026",
  description: "Your donation to the Bob Willis Fund is confirmed.",
};

export default function ThanksPage() {
  return (
    <Suspense fallback={null}>
      <ThanksView />
    </Suspense>
  );
}
