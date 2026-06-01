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

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const siteUrl = process.env.SITE_URL ?? "https://blue.bobwillisfund.org";

  const templateBuffer = await readFile(
    path.join(process.cwd(), "public/share/stadium-template.jpg"),
  );
  const templateDataUrl = `data:image/jpeg;base64,${templateBuffer.toString("base64")}`;

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
            ? {
                displayName: lead.displayName,
                text: lead.text,
                recipientName: lead.recipientName,
              }
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
        {/* Stadium photo template — the entire background. Donor name
            and tribute composite into the sky banner area above the
            stand roof; "Bob" on the chair stays as the campaign mark. */}
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

        {/* Sky banner — a heavier semi-opaque navy strip so the name
            and dedication read sharply even at thumbnail/unfurl sizes.
            Taller than the original to fit a larger dedication line. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 180,
            background:
              "linear-gradient(180deg, rgba(0,20,45,0.88) 0%, rgba(0,20,45,0.78) 70%, rgba(0,20,45,0) 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 8,
              fontWeight: 800,
              color: "rgba(255,230,168,0.95)",
              textTransform: "uppercase",
              marginBottom: 10,
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            {scene.skyTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: scene.plaqueName.length > 14 ? 56 : 72,
              fontWeight: 900,
              letterSpacing: 3,
              color: "#FFFFFF",
              textTransform: "uppercase",
              marginBottom: 10,
              maxWidth: 1100,
              textShadow:
                "0 3px 10px rgba(0,0,0,0.75), 0 1px 0 rgba(0,0,0,0.9)",
            }}
          >
            {scene.plaqueName || "A SEAT WAITS"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 600,
              color: "#FFFFFF",
              maxWidth: 1080,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}
          >
            “{scene.skyMessage}”
          </div>
        </div>

        {/* Footer — a darker base under the chair so the CTA reads on
            top of the photo's busiest area. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            background:
              "linear-gradient(0deg, rgba(0,30,60,0.85) 0%, rgba(0,30,60,0) 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 48px 10px",
            color: "#FFFFFF",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <span>{scene.cta}</span>
          <span style={{ color: "#7DCFFF" }}>{scene.ctaHost}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
