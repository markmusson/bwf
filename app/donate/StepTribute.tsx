"use client";

const TRIBUTE_MAX_LENGTH = 280;

export interface StepTributeValue {
  displayName: string;
  recipientName: string;
  text: string;
  hideName: boolean;
  hideAmount: boolean;
}

export const EMPTY_STEP_TRIBUTE: StepTributeValue = {
  displayName: "",
  recipientName: "",
  text: "",
  hideName: false,
  hideAmount: false,
};

interface Props {
  value: StepTributeValue;
  onChange: (next: StepTributeValue) => void;
}

export function StepTribute({ value, onChange }: Props) {
  const remaining = TRIBUTE_MAX_LENGTH - value.text.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="tribute-recipient" className="text-sm font-medium">
          Who is this seat dedicated to? (optional)
        </label>
        <input
          id="tribute-recipient"
          type="text"
          value={value.recipientName}
          onChange={(event) =>
            onChange({ ...value, recipientName: event.target.value })
          }
          placeholder="e.g. Bob — the name shown on the seat plaque"
          maxLength={60}
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
        />
        <p className="text-xs text-white/60">
          This is the name printed on your virtual seat. Leave blank and we
          fall back to your first name, then to &ldquo;Bob&rdquo;.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tribute-display-name" className="text-sm font-medium">
          Your name (optional)
        </label>
        <input
          id="tribute-display-name"
          type="text"
          value={value.displayName}
          onChange={(event) =>
            onChange({ ...value, displayName: event.target.value })
          }
          placeholder="e.g. Sarah W. — shown on the wall as the donor"
          maxLength={60}
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
        />
        <p className="text-xs text-white/60">
          The donor name shown next to the tribute. Leave blank to appear as
          Anonymous on the wall.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tribute-text" className="text-sm font-medium">
          Leave a tribute (optional)
        </label>
        <textarea
          id="tribute-text"
          value={value.text}
          onChange={(event) => {
            const next = event.target.value.slice(0, TRIBUTE_MAX_LENGTH);
            onChange({ ...value, text: next });
          }}
          rows={4}
          placeholder="In memory of… or a few words for Bob."
          className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
          aria-describedby="tribute-counter"
        />
        <p
          id="tribute-counter"
          className={[
            "text-xs",
            remaining < 0 ? "text-amber-300" : "text-white/60",
          ].join(" ")}
        >
          {remaining} characters left.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Privacy</legend>
        <label className="flex items-start gap-3 rounded-lg bg-white/5 p-3 text-sm">
          <input
            type="checkbox"
            checked={value.hideName}
            onChange={(event) =>
              onChange({ ...value, hideName: event.target.checked })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">
              Hide my name from the wall
            </span>
            <span className="text-white/70">
              Your seat still shows on the map, just without your name.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg bg-white/5 p-3 text-sm">
          <input
            type="checkbox"
            checked={value.hideAmount}
            onChange={(event) =>
              onChange({ ...value, hideAmount: event.target.checked })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Hide my donation amount</span>
            <span className="text-white/70">
              The total raised still includes you; the per-seat figure is
              hidden.
            </span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
