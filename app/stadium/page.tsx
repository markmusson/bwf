import type { Metadata } from "next";
import { Suspense } from "react";
import { StadiumExperience } from "./StadiumExperience";

export const metadata: Metadata = {
  title: "BWF Virtual Seats — Edgbaston",
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
