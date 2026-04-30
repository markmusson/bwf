import Script from "next/script";

// Plausible loads at runtime (after-interactive) and is keyed off
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Without that env var the component
// renders nothing — local dev and CI stay analytics-free. Plausible
// uses no cookies and aggregates pageviews server-side, so no cookie
// banner gating is required (PECR Reg.6 / GDPR recital 30).

export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      strategy="afterInteractive"
      data-domain={domain}
      data-testid="plausible-script"
      src="https://plausible.io/js/script.js"
    />
  );
}
