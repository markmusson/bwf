import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin — Blue for Bob 2026",
};

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
