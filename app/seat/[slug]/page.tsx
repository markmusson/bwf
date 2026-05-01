import type { Metadata } from "next";
import { Suspense } from "react";
import { SeatCard } from "./SeatCard";

export const metadata: Metadata = {
  title: "A seat at Edgbaston",
  description:
    "A donor turned this Edgbaston seat blue for the Bob Willis Fund.",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SeatPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <SeatCard slug={slug} />
    </Suspense>
  );
}
