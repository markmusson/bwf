"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";

// Slim nav strip rendered under the brand header on every page so
// donors aren't relying on URL guessing or the back button. Stadium
// and Wall are the primary CTAs and sit centred. Manage appears once
// the donor has a session; Admin shows only on the allowlist.
export function AppNav() {
  const auth = useConvexAuth();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    auth.isAuthenticated ? {} : "skip",
  );
  const pathname = usePathname();

  const primary = [
    { href: "/stadium", label: "Stadium" },
    { href: "/wall", label: "Wall" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="bg-bwf-navy/95 border-bwf-blue/30 border-b text-white"
    >
      <div className="relative mx-auto flex max-w-3xl items-center justify-center px-5 py-3">
        <ul className="font-display flex items-center gap-2 text-[12px] tracking-[2px] uppercase">
          {primary.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-full px-4 py-1.5 transition-colors",
                    active
                      ? "bg-bwf-blue text-white"
                      : "text-white/85 hover:bg-white/10",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <ul className="font-display absolute right-5 flex items-center gap-3 text-[10px] tracking-[2px] uppercase">
          {auth.isAuthenticated ? (
            <li>
              <Link
                href="/manage"
                className={[
                  "transition-colors",
                  pathname === "/manage"
                    ? "text-bwf-pale"
                    : "text-white/70 hover:text-white",
                ].join(" ")}
              >
                Manage
              </Link>
            </li>
          ) : null}
          {isAdmin === true ? (
            <li>
              <Link
                href="/admin"
                className={[
                  "transition-colors",
                  pathname?.startsWith("/admin")
                    ? "text-bwf-pale"
                    : "text-white/70 hover:text-white",
                ].join(" ")}
              >
                Admin
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    </nav>
  );
}
