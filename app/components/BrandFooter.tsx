import Link from "next/link";
import { BWF } from "@/lib/branding";

export function BrandFooter() {
  return (
    <footer
      role="contentinfo"
      className="bg-bwf-deep border-bwf-blue/20 mt-12 border-t text-white/75"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-8 text-center text-sm font-normal">
        <p className="text-base font-normal text-white">
          The Bob Willis Fund — Raising money for better prostate cancer
          screening
        </p>
        <p className="text-xs font-normal text-white/65">
          Named in honour of Bob Willis, England cricket legend (1949–2019)
        </p>
        <p className="text-xs font-normal text-white/55">
          <a
            href={`https://${BWF.domain}`}
            target="_blank"
            rel="noreferrer"
            className="font-normal hover:text-white"
          >
            {BWF.domain}
          </a>{" "}
          · Administered by {BWF.administeredBy} · Charity No.{" "}
          {BWF.charityNumber}
        </p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-normal">
          <Link href="/privacy" className="font-normal hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="font-normal hover:text-white">
            Terms
          </Link>
          <Link href="/prize-terms" className="font-normal hover:text-white">
            Prize draw T&amp;Cs
          </Link>
        </nav>
      </div>
    </footer>
  );
}
