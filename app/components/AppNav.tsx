"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

// Slim nav strip rendered under the brand header on every page so
// donors aren't relying on URL guessing or the back button. Visible
// links scale with privilege: Stadium and Wall are public, Manage
// appears once the donor has a session, Admin shows only on the
// allowlist.
export function AppNav() {
  const auth = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    auth.isAuthenticated ? {} : "skip",
  );

  return (
    <nav
      aria-label="Primary"
      className="bg-bwf-navy/95 border-bwf-blue/30 border-b text-white"
    >
      <ul className="font-display mx-auto flex max-w-3xl items-center gap-4 px-5 py-2 text-[11px] tracking-[2px] uppercase">
        <li>
          <Link href="/stadium" className="hover:text-bwf-pale">
            Stadium
          </Link>
        </li>
        <li>
          <Link href="/wall" className="hover:text-bwf-pale">
            Wall
          </Link>
        </li>
        {auth.isAuthenticated ? (
          <li>
            <Link href="/manage" className="hover:text-bwf-pale">
              Manage
            </Link>
          </li>
        ) : null}
        {isAdmin === true ? (
          <li className="ml-auto">
            <Link href="/admin" className="text-bwf-pale hover:text-white">
              Admin
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
