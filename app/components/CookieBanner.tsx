"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bwf:cookie-acknowledged-v1";

function readAck(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "yes";
  } catch {
    return false;
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function CookieBanner() {
  const acknowledged = useSyncExternalStore(
    subscribe,
    () => readAck(),
    () => true,
  );

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "yes");
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore — private mode etc.
    }
  };

  if (acknowledged) return null;

  return (
    <aside
      role="dialog"
      aria-labelledby="cookie-banner-title"
      data-testid="cookie-banner"
      className="bg-bwf-navy border-bwf-blue/40 fixed inset-x-3 bottom-3 z-40 flex flex-col gap-3 rounded-xl border p-4 text-sm text-white shadow-xl sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex-1" id="cookie-banner-title">
        We use essential cookies to keep you signed in and remember your seat
        hold. No advertising or tracking cookies. See our{" "}
        <Link href="/privacy" className="text-bwf-blue-light underline">
          privacy notice
        </Link>{" "}
        for the detail.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="font-display bg-bwf-blue hover:bg-bwf-blue-light rounded-full px-4 py-2 text-xs tracking-wider text-white"
      >
        OK, got it
      </button>
    </aside>
  );
}
