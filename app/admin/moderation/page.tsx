import type { Metadata } from "next";
import { ModerationQueue } from "./ModerationQueue";

export const metadata: Metadata = {
  title: "Moderation queue · BWF Admin",
  description: "Approve or reject tributes flagged by the profanity filter.",
};

export default function ModerationPage() {
  return <ModerationQueue />;
}
