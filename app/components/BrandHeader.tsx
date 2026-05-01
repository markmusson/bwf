import Image from "next/image";
import Link from "next/link";
import { BWF } from "@/lib/branding";

export function BrandHeader() {
  return (
    <header
      role="banner"
      className="border-b-[3px] px-5 py-6 text-white"
      style={{ backgroundColor: "#153A5D", borderBottomColor: "#3A83C5" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <Link
          href="/stadium"
          aria-label="The Bob Willis Fund — home"
          className="flex flex-shrink-0 items-center justify-center rounded-2xl p-2"
          style={{ backgroundColor: "#3E8BCE" }}
        >
          <Image
            src="/brand/bwf-logo-square.svg"
            alt="The Bob Willis Fund"
            width={72}
            height={72}
            priority
            className="h-16 w-16 sm:h-20 sm:w-20"
          />
        </Link>

        <h1 className="font-display text-[clamp(32px,7vw,54px)] leading-none font-black tracking-[1px] uppercase">
          Blue for <span className="text-bwf-blue-light">Bob</span> 2026
        </h1>

        <ul
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Match information"
        >
          {BWF.campaign.matchPills.map((pill) => {
            const isDonateAccent = pill === "ODI · Summer 2026";
            return (
              <li
                key={pill}
                className={[
                  "font-display inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.5px] text-white uppercase",
                  isDonateAccent
                    ? "border-0"
                    : "ring-bwf-blue/40 bg-[rgba(0,133,202,0.2)] ring-1",
                ].join(" ")}
                style={
                  isDonateAccent ? { backgroundColor: "#3A83C5" } : undefined
                }
              >
                {pill}
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
