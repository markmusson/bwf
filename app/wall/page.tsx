import type { Metadata } from "next";
import { Suspense } from "react";
import { WallView } from "./WallView";

export const metadata: Metadata = {
  title: "The wall",
  description: "Tributes left by donors at Edgbaston for the Bob Willis Fund.",
};

export default function WallPage() {
  return (
    <Suspense fallback={null}>
      <WallView />
    </Suspense>
  );
}
