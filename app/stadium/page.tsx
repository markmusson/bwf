import type { Metadata } from "next";
import { Suspense } from "react";
import { StadiumExperience } from "./StadiumExperience";

export const metadata: Metadata = {
  // The stadium page is effectively the home — let the layout's
  // default title ("Blue for Bob 2026 — The Bob Willis Fund") render.
  title: { absolute: "Blue for Bob 2026 — The Bob Willis Fund" },
  description:
    "Pick a seat at Edgbaston for the Bob Willis Fund. Tribute, donation from £10.",
};

export default function StadiumPage() {
  return (
    <Suspense fallback={null}>
      <StadiumExperience />
    </Suspense>
  );
}
