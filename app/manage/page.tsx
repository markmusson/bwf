import type { Metadata } from "next";
import { ManageView } from "./ManageView";

export const metadata: Metadata = {
  title: "Manage your seats",
  description: "Edit the tribute and display name on the seats you've claimed.",
};

export default function ManagePage() {
  return <ManageView />;
}
