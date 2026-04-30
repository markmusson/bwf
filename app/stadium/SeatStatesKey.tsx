interface State {
  label: string;
  fill: string;
  ring?: string;
}

const STATES: readonly State[] = [
  {
    label: "Available",
    fill: "rgba(255,255,255,0.18)",
    ring: "rgba(255,255,255,0.35)",
  },
  { label: "Held — someone's paying", fill: "#fbbf24" },
  { label: "Yours — taken", fill: "#0085CA" },
];

export function SeatStatesKey() {
  return (
    <ul
      aria-label="Seat states key"
      className="flex flex-wrap items-center gap-3 text-xs text-white/80"
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
