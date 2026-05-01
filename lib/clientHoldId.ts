// Browser-issued, persistent UUID used to key seat holds and donation
// drafts. Persists in localStorage so a refresh or a Stripe redirect
// doesn't lose the hold. The server treats this as opaque — there is
// no PII in it. Length floor (>=8) is enforced server-side too.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "bwf:clientHoldId:v1";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID — vanishingly
  // rare on browsers we care about, but keeps SSR builds happy.
  const buf = new Uint8Array(16);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getOrCreateClientHoldId(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return makeId();
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 8) return existing;
  const fresh = makeId();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Hook variant — SSR-safe, returns null on the server / first paint
// then the real id once we mount in the browser. Use this in client
// components so we don't trigger the set-state-in-effect lint rule.
export function useClientHoldId(): string | null {
  return useSyncExternalStore<string | null>(
    subscribe,
    () => getOrCreateClientHoldId(),
    () => null,
  );
}
