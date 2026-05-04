import { BWF } from "@/lib/branding";

// The BWF mark used to live here as a logo tile; it's now rendered
// dead-centre on the stadium pitch (see StadiumCanvas overlay), which
// is a more dramatic placement and saves header height. Title +
// match-info pills only.
export function BrandHeader() {
  return (
    <header
      role="banner"
      className="border-b-[3px] px-5 py-3 text-white"
      style={{ backgroundColor: "#153A5D", borderBottomColor: "#3A83C5" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[clamp(28px,6vw,48px)] leading-none font-black tracking-[1px] uppercase">
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
                  "font-display inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-[0.5px] text-white uppercase",
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
