import type { Metadata } from "next";
import { CompleteView } from "./CompleteView";

export const metadata: Metadata = {
  title: "Thank you · BWF Virtual Seats",
  description:
    "Your seat is yours. Thank you for supporting the Bob Willis Fund.",
};

interface PageProps {
  searchParams: Promise<{ session_id?: string | string[] }>;
}

export default async function CompletePage({ searchParams }: PageProps) {
  const { session_id } = await searchParams;
  const sessionId = Array.isArray(session_id) ? session_id[0] : session_id;
  return <CompleteView sessionId={sessionId} />;
}
