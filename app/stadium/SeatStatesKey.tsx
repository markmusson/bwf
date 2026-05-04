interface State {
  label: string;
  fill: string;
  ring?: string;
}

// Single-claim model: each seat is available, in flight (held while
// someone's paying), or taken. The hover tooltip + click-through to
// /seat/<slug> reveal the tribute on a taken seat.
const STATES: readonly State[] = [
  {
    label: "Available",
    fill: "rgba(255,255,255,0.18)",
    ring: "rgba(255,255,255,0.35)",
  },
  {
    label: "Held — someone's paying",
    fill: "#fbbf24",
    ring: "rgba(0,0,0,0.25)",
  },
  {
    label: "Claimed",
    fill: "#0085CA",
    ring: "rgba(255,255,255,0.65)",
  },
];

export function SeatStatesKey() {
  return (
    <ul
      aria-label="Seat states key"
      className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-normal tracking-[1px] text-white/85 uppercase"
    >
      {STATES.map((state) => (
        <li key={state.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className="block h-3 w-3 rounded-full"
            style={{
              backgroundColor: state.fill,
              boxShadow: state.ring
                ? `inset 0 0 0 1px ${state.ring}`
                : undefined,
            }}
          />
          {state.label}
        </li>
      ))}
    </ul>
  );
}
