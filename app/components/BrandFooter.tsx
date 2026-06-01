import Link from "next/link";
import { BWF } from "@/lib/branding";

// Footer is a single muted block, mock-exact: 12px regular Barlow,
// rgba(255,255,255,.4) text, br-separated lines. Only the BWF
// wordmark gets <strong> for a slight bump in opacity (.7 vs .4).
// border-top thin white/12, bg bwf-dark.
export function BrandFooter() {
  return (
    <footer
      role="contentinfo"
      className="bg-bwf-dark mt-2 border-t border-white/12 px-5 py-6 text-center text-[12px] leading-[1.8] font-normal text-white/40"
    >
      <strong className="font-semibold text-white/70">
        The Bob Willis Fund
      </strong>{" "}
      — Raising money for better prostate cancer screening
      <br />
      Named in honour of Bob Willis, England cricket legend (1949–2019)
      <br />
      <a
        href={`https://${BWF.domain}`}
        target="_blank"
        rel="noreferrer"
        className="text-white/60 underline hover:text-white"
      >
        {BWF.domain}
      </a>{" "}
      &nbsp;·&nbsp; Administered by {BWF.administeredBy} · Charity No.{" "}
      {BWF.charityNumber}
      <br />
      <span className="mt-2 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
        <Link href="/privacy" className="text-white/55 hover:text-white">
          Privacy
        </Link>
        <Link href="/terms" className="text-white/55 hover:text-white">
          Terms
        </Link>
        {/* Prize draw T&Cs hidden until the prize element is
            confirmed (Adam, 1 Jun). Page itself stays live so a direct
            link still resolves; just not surfaced in the nav. */}
      </span>
    </footer>
  );
}
