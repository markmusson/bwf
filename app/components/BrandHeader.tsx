import Image from "next/image";
import Link from "next/link";
import { BWF } from "@/lib/branding";

export function BrandHeader() {
  return (
    <header
      role="banner"
      className="bg-bwf-blue border-bwf-blue-light/40 border-b-[3px] px-5 py-6 text-white"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <Link
          href="/stadium"
          aria-label="The Bob Willis Fund — home"
          className="flex flex-shrink-0 items-center justify-center"
        >
          <Image
            src="/brand/bwf-logo-white.svg"
            alt="The Bob Willis Fund"
            width={64}
            height={64}
            priority
            className="h-14 w-14 sm:h-16 sm:w-16"
          />
        </Link>

        <h1 className="font-display text-[clamp(32px,7vw,54px)] leading-none">
          Blue for <span className="text-bwf-blue-light">Bob</span> 2026
        </h1>

        <ul
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Match information"
        >
          {BWF.campaign.matchPills.map((pill) => (
            <li
              key={pill}
              className="font-display ring-bwf-blue-light/30 inline-flex items-center rounded-full bg-[rgba(255,255,255,0.10)] px-3 py-1 text-[12px] tracking-wider text-white ring-1"
            >
              {pill}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
