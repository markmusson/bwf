import type { Metadata } from "next";
import { Suspense } from "react";
import { SeatCard } from "./SeatCard";

export const metadata: Metadata = {
  title: "A seat at Edgbaston — Blue for Bob 2026",
  description:
    "A donor turned this Edgbaston seat blue for the Bob Willis Fund.",
};

interface PageProps {
  params: Promise<{ seatId: string }>;
}

export default async function SeatPage({ params }: PageProps) {
  const { seatId } = await params;
  return (
    <Suspense fallback={null}>
      <SeatCard seatId={seatId} />
    </Suspense>
  );
}
