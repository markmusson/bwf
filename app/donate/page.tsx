import type { Metadata } from "next";
import { DonationWizard } from "./DonationWizard";

export const metadata: Metadata = {
  title: "Donate · BWF Virtual Seats",
  description:
    "Support the Bob Willis Fund. Pick a seat, leave a tribute, donate from £10.",
};

export default function DonatePage() {
  return <DonationWizard />;
}
