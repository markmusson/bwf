import Image from "next/image";
import Link from "next/link";
import { BWF } from "@/lib/branding";

const PILL_ICONS: Record<number, string> = {
  0: "📅",
  1: "🏏",
  2: "📍",
};

export function BrandHeader() {
  return (
    <header
      role="banner"
      className="bg-bwf-navy border-bwf-blue border-b-[3px] px-5 pt-4 pb-3 text-white"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <div className="flex w-full items-center justify-between gap-4">
          <Link
            href="/stadium"
            className="flex flex-shrink-0 items-center gap-3"
            aria-label="The Bob Willis Fund — home"
          >
            <span className="font-display text-left">
              <span className="block text-[9px] tracking-[3px] text-white/60">
                The
              </span>
              <span className="block text-[18px] leading-none text-white">
                Bob Willis
              </span>
              <span className="block text-[18px] leading-none text-white">
                Fund
              </span>
            </span>
          </Link>
          <Link
            href="#donate"
            aria-label="Donate"
            className="font-display ring-bwf-blue/40 hidden rounded-full px-4 py-2 text-[12px] tracking-[2px] text-white ring-1 hover:bg-white/5 sm:inline-flex"
          >
            Donate
          </Link>
        </div>

        <Image
          src="/brand/bwf-logo.svg"
          alt=""
          width={64}
          height={64}
          aria-hidden
          priority
          className="bg-bwf-blue rounded-md"
        />

        <h1 className="font-display text-[clamp(32px,7vw,54px)]">
          Blue for <span className="text-bwf-blue-light">Bob</span> 2026
        </h1>

        <ul
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Match information"
        >
          {BWF.campaign.matchPills.map((pill, index) => (
            <li
              key={pill}
              className="font-display ring-bwf-blue/40 inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,133,202,0.2)] px-3 py-1 text-[12px] tracking-wider text-white ring-1"
            >
              <span aria-hidden>{PILL_ICONS[index]}</span>
              {pill}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
