"use client";

import { useEffect, useState } from "react";
import {
  buildEmailShareUrl,
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
} from "@/lib/shareIntents";

interface Props {
  // Public URL of the donor's seat page. Crawlers fetch this URL and
  // unfurl the OG card from /seat/<slug>/opengraph-image.
  seatUrl: string;
  // Public URL of the OG image PNG itself, used as the Download target
  // for donors who want to repost to Instagram (no web intent there).
  imageUrl: string;
  // Donor display name (or "Anonymous") for the share copy.
  displayName: string | null;
}

const SHARE_TEXT_BASE =
  "I just dedicated a seat at Edgbaston for the Bob Willis Fund — fighting prostate cancer in Bob's name.";

function buildShareText(displayName: string | null): string {
  if (!displayName) return SHARE_TEXT_BASE;
  return `${displayName} dedicated a seat at Edgbaston for the Bob Willis Fund — fighting prostate cancer in Bob's name.`;
}

export function SeatShareButtons({ seatUrl, imageUrl, displayName }: Props) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // navigator.share is mobile-first. On desktop it's available in
    // some browsers but we still want the platform row visible, so
    // we ALWAYS show the buttons and ADDITIONALLY surface the native
    // share sheet button when supported (covers Instagram on iOS).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      setCanNativeShare(true);
    }
  }, []);

  const shareText = buildShareText(displayName);

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Blue for Bob — my seat at Edgbaston",
        text: shareText,
        url: seatUrl,
      });
    } catch {
      // User cancelled or share blocked — fall through silently.
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers without clipboard API — no-op
    }
  };

  return (
    <section
      aria-label="Share your seat"
      className="ring-bwf-blue/25 flex flex-col gap-3 rounded-xl bg-white/5 p-4 ring-1"
    >
      <p className="font-display text-bwf-pale text-[11px] font-semibold tracking-[2px] uppercase">
        Share your seat
      </p>

      {canNativeShare ? (
        <button
          type="button"
          onClick={handleNativeShare}
          className="font-display bg-bwf-blue hover:bg-bwf-blue-light w-full rounded-full px-5 py-3 text-sm font-bold tracking-wider text-white transition-colors"
        >
          Share via apps
        </button>
      ) : null}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ShareLink
          href={buildTwitterShareUrl({ url: seatUrl, text: shareText })}
          label="X (Twitter)"
        />
        <ShareLink
          href={buildLinkedInShareUrl({ url: seatUrl })}
          label="LinkedIn"
        />
        <ShareLink
          href={buildWhatsAppShareUrl({ url: seatUrl, text: shareText })}
          label="WhatsApp"
        />
        <ShareLink
          href={buildFacebookShareUrl({ url: seatUrl })}
          label="Facebook"
        />
        <ShareLink
          href={buildEmailShareUrl({
            url: seatUrl,
            subject: "Blue for Bob — my seat at Edgbaston",
            text: shareText,
          })}
          label="Email"
        />
        <a
          href={imageUrl}
          download={`bwf-seat-${displayName ?? "anonymous"}.png`}
          className="font-display flex items-center justify-center rounded-full border border-white/15 px-3 py-2.5 text-center text-[12px] font-bold tracking-[1px] text-white/85 uppercase transition-colors hover:border-[var(--color-bwf-blue)] hover:text-white"
        >
          Download image
        </a>
      </ul>

      <button
        type="button"
        onClick={handleCopy}
        className="font-display rounded-full border border-white/15 px-4 py-2 text-center text-[12px] font-bold tracking-[1px] text-white/75 uppercase transition-colors hover:border-[var(--color-bwf-blue)] hover:text-white"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>

      <p className="text-[11px] leading-snug text-white/55">
        Posts include the image of your dedicated seat. Instagram? Use the
        Share via apps button on your phone or download the image and post
        from there.
      </p>
    </section>
  );
}

interface ShareLinkProps {
  href: string;
  label: string;
}

function ShareLink({ href, label }: ShareLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-display flex items-center justify-center rounded-full border border-white/15 px-3 py-2.5 text-center text-[12px] font-bold tracking-[1px] text-white/85 uppercase transition-colors hover:border-[var(--color-bwf-blue)] hover:text-white"
    >
      {label}
    </a>
  );
}
