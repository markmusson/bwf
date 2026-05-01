// Open Graph share image at /seat/<slug>/opengraph-image. Next.js'
// file-system convention auto-mounts this route handler and wires
// the metadata.openGraph.images entry on the page.
//
// We hit the public Convex deployment server-side (no auth) via
// ConvexHttpClient and feed the result into buildOgScene for the
// strings, then render with @vercel/og's ImageResponse.

import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { buildOgScene } from "@/lib/og";

export const runtime = "edge";
export const alt = "A seat at Edgbaston turned blue for Bob.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BWF_BLUE = "#0085CA";
const BWF_NAVY = "#003B60";
const BWF_DEEP = "#001E3C";
const BWF_GOLD = "#FFD700";
const PALE = "#33A8E0";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  // Default scene used for unclaimed seats AND any backend hiccup —
  // a share-card preview should never error the client.
  let scene = buildOgScene({ slug, donors: 0, raisedPence: 0, lead: null });

  if (url) {
    try {
      const client = new ConvexHttpClient(url);
      const card = await client.query(api.seats.getCardBySlug, { slug });
      if (card) {
        const lead = card.tributes[0] ?? null;
        scene = buildOgScene({
          slug,
          donors: card.donors,
          raisedPence: card.raisedPence,
          lead: lead
            ? {
                displayName: lead.displayName,
                amountPence: lead.amountPence,
                giftAid: lead.giftAid,
                text: lead.text,
              }
            : null,
        });
      }
    } catch {
      // Silently fall through to the unclaimed scene so the share
      // image always returns 200.
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${BWF_BLUE} 0%, ${BWF_NAVY} 60%, ${BWF_DEEP} 100%)`,
        color: "white",
        fontFamily: "sans-serif",
        padding: "64px",
        position: "relative",
      }}
    >
      {/* Brand strip: BWF wordmark + campaign title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 16,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            The Bob Willis Fund
          </span>
          <span
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Blue for <span style={{ color: PALE }}>Bob</span> 2026
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 999,
            background: BWF_GOLD,
            color: BWF_NAVY,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {scene.tierPrice}
        </div>
      </div>

      {/* Seat eyebrow */}
      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: PALE,
          marginBottom: 8,
        }}
      >
        {scene.standName} · {scene.seatLabel}
      </div>

      {/* Headline */}
      <div
        style={{
          display: "flex",
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: 1,
          lineHeight: 1.05,
          textTransform: "uppercase",
          marginBottom: 24,
          maxWidth: 980,
        }}
      >
        {scene.headline}
      </div>

      {/* Summary line */}
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          marginBottom: scene.tributeSnippet ? 28 : 0,
        }}
      >
        {scene.summary}
      </div>

      {/* Tribute snippet (optional) */}
      {scene.tributeSnippet ? (
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.92)",
            padding: "22px 28px",
            borderRadius: 16,
            background: "rgba(0,30,60,0.55)",
            border: `1px solid rgba(0,133,202,0.35)`,
            maxWidth: 1000,
          }}
        >
          “{scene.tributeSnippet}”
        </div>
      ) : null}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 32,
          left: 64,
          right: 64,
          justifyContent: "space-between",
          color: "rgba(255,255,255,0.55)",
          fontSize: 18,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        <span>bobwillisfund.org</span>
        <span>{slug}</span>
      </div>
    </div>,
    { ...size },
  );
}
