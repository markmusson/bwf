interface State {
  label: string;
  fill: string;
  ring?: string;
}

// Multi-claim model: every seat can be donated to any number of
// times. Colour reflects donor count, not exclusivity. The "held"
// amber state still applies during the brief paying-in-flight window.
const STATES: readonly State[] = [
  {
    label: "Available",
    fill: "rgba(255,255,255,0.18)",
    ring: "rgba(255,255,255,0.35)",
  },
  {
    label: "Claimed once",
    fill: "#0085CA",
    ring: "rgba(255,255,255,0.65)",
  },
  {
    label: "Claimed multiple times",
    fill: "#ffffff",
    ring: "rgba(0,133,202,0.7)",
  },
];

export function SeatStatesKey() {
  return (
    <ul
      aria-label="Seat states key"
      className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-normal tracking-[1px] text-white/80 uppercase"
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
