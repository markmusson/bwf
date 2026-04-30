import Link from "next/link";
import { BWF, BWF_FOOTER_TEXT } from "@/lib/branding";

export function BrandFooter() {
  return (
    <footer
      role="contentinfo"
      className="bg-bwf-deep border-bwf-blue/20 mt-12 border-t text-white/80"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>{BWF_FOOTER_TEXT}</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/prize-terms" className="hover:text-white">
            Prize draw T&amp;Cs
          </Link>
          <a
            href={`https://${BWF.domain}`}
            className="hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            {BWF.domain}
          </a>
        </nav>
      </div>
    </footer>
  );
}
