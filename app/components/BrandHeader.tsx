import Link from "next/link";
import { BWF } from "@/lib/branding";

export function BrandHeader() {
  return (
    <header
      role="banner"
      className="bg-bwf-deep border-bwf-blue/20 border-b text-white"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/stadium"
            className="flex items-center gap-3"
            aria-label="The Bob Willis Fund — home"
          >
            <span
              aria-hidden
              className="bg-bwf-blue grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
            >
              BWF
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">
                {BWF.campaign.title}
              </span>
              <span className="text-bwf-pale text-xs">
                {BWF.campaign.subtitle}
              </span>
            </span>
          </Link>
        </div>
        <ul
          className="flex flex-wrap items-center gap-2"
          aria-label="Match information"
        >
          {BWF.campaign.matchPills.map((pill) => (
            <li
              key={pill}
              className="bg-bwf-blue/15 text-bwf-pale ring-bwf-blue/40 rounded-full px-3 py-1 text-xs ring-1"
            >
              {pill}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
