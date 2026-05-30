// Open Graph share image at /seat/<slug>/opengraph-image. Next.js'
// file-system convention auto-mounts this route handler and wires
// the metadata.openGraph.images entry on the page.
//
// We hit the public Convex deployment server-side (no auth) via
// ConvexHttpClient, feed the result into buildSeatShareScene for the
// strings, then composite them over the stadium template via
// @vercel/og's ImageResponse.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { buildSeatShareScene } from "@/lib/seatShare";

// nodejs (not edge) runtime so we can read the template image directly
// from public/. Cold-start is slightly slower but OG image responses
// are crawler-fetched and cached, so latency isn't user-facing.
export const runtime = "nodejs";
export const alt = "A seat at Edgbaston turned blue for Bob.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

// Pixel positions on the 1200x630 cropped template, measured against
// the reference render. Tune via /seat/<slug>/opengraph-image — the
// layout is brittle to small changes in the source crop.
const PLAQUE = {
  centerX: 595,
  centerY: 415,
  // Box width is forgiving so 16-char truncation never overflows the
  // brass plate visually.
  width: 340,
  // Height of the visible brass strip — used to position the donor
  // name vertically on it.
  height: 56,
};
const SKY = {
  titleY: 36,
  messageY: 96,
};
const FOOTER_Y = 560;

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const siteUrl = process.env.SITE_URL ?? "https://blue.bobwillisfund.org";

  // Read template once, inline as data URL — Vercel's edge function
  // pricing rewards small responses but the JPEG is ~265KB and ends up
  // base64-encoded into the PNG anyway.
  const templateBuffer = await readFile(
    path.join(process.cwd(), "public/share/stadium-template.jpg"),
  );
  const templateDataUrl = `data:image/jpeg;base64,${templateBuffer.toString("base64")}`;

  // Default scene used for unclaimed seats AND any backend hiccup —
  // a share-card preview should never error the client.
  let scene = buildSeatShareScene({
    slug,
    donors: 0,
    raisedPence: 0,
    lead: null,
    siteUrl,
  });

  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const card = await client.query(api.seats.getCardBySlug, { slug });
      if (card) {
        const lead = card.tributes[0] ?? null;
        scene = buildSeatShareScene({
          slug,
          donors: card.donors,
          raisedPence: card.raisedPence,
          lead: lead
            ? { displayName: lead.displayName, text: lead.text }
            : null,
          siteUrl,
        });
      }
    } catch {
      // Silently fall through to the unclaimed scene so the share
      // image always returns 200.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Stadium photo template — the entire background. */}
        <img
          src={templateDataUrl}
          width={size.width}
          height={size.height}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Sky: title + script message. White text reads cleanly over
            the sky band at the top of the photo. */}
        <div
          style={{
            position: "absolute",
            top: SKY.titleY,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: "0 2px 8px rgba(0,30,60,0.45)",
          }}
        >
          {scene.skyTitle}
        </div>
        <div
          style={{
            position: "absolute",
            top: SKY.messageY,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 30,
            fontStyle: "italic",
            color: "#E8F4FB",
            textShadow: "0 2px 6px rgba(0,30,60,0.55)",
            maxWidth: size.width,
          }}
        >
          {scene.skyMessage}
        </div>

        {/* Brass plaque: donor name in dark caps, vertically centred on
            the photo's existing brass rectangle. We sit ON TOP — no
            plate background of our own. Box uses flex centering so a
            single-line name lands on the brass strip's vertical midline
            regardless of font metrics. */}
        <div
          style={{
            position: "absolute",
            top: PLAQUE.centerY - PLAQUE.height / 2,
            left: PLAQUE.centerX - PLAQUE.width / 2,
            width: PLAQUE.width,
            height: PLAQUE.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 4,
            color: "#1A2A3A",
            textTransform: "uppercase",
          }}
        >
          {scene.plaqueName}
        </div>

        {/* Plaque subtitle (white, under the plaque). */}
        <div
          style={{
            position: "absolute",
            top: PLAQUE.centerY + PLAQUE.height / 2 + 14,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#FFFFFF",
            textShadow: "0 2px 6px rgba(0,30,60,0.55)",
          }}
        >
          {scene.plaqueSubtitle}
        </div>

        {/* Footer: CTA + host. Positioned over the lower seat row so
            it sits in the photo's darker quiet band. */}
        <div
          style={{
            position: "absolute",
            top: FOOTER_Y,
            left: 64,
            right: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#FFFFFF",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
            textShadow: "0 2px 6px rgba(0,30,60,0.55)",
          }}
        >
          <span>{scene.cta}</span>
          <span style={{ color: "#FFD700" }}>{scene.ctaHost}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
