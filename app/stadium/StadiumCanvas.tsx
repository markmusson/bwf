"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useClientHoldId } from "@/lib/clientHoldId";
import {
  buildAllSeats,
  CENTER_X,
  CENTER_Y,
  ROW_SPACING,
  SEAT_RADIUS,
  STADIUM_HEIGHT,
  STADIUM_WIDTH,
  type Seat,
  vToRad,
} from "@/lib/geometry";
import { STANDS } from "@/lib/stands";

type SeatStatus = "available" | "taken";
type VisualStatus = "available" | "held" | "taken";

interface Props {
  /**
   * Called when the donor's claim succeeds. Stadium page opens the
   * donate modal in response — no in-component navigation.
   */
  onSeatClaimed?: (seatId: Id<"seats">) => void;
}

const STAND_FILL_BASE = "#001e3c";
const SEAT_AVAILABLE = "rgba(255,255,255,0.18)";
const SEAT_HELD = "#fbbf24";
const SEAT_TAKEN = "#0085ca";
const SEAT_HOVER = "rgba(255,255,255,0.55)";
const SEAT_SELECTED = "#ffffff";

function statusKey(stand: string, row: number, num: number): string {
  return `${stand}:${row}:${num}`;
}

function visualForSeat(status: SeatStatus, isHeld: boolean): VisualStatus {
  if (status === "taken") return "taken";
  if (isHeld) return "held";
  return "available";
}

function fillForVisual(visual: VisualStatus): string {
  switch (visual) {
    case "taken":
      return SEAT_TAKEN;
    case "held":
      return SEAT_HELD;
    case "available":
      return SEAT_AVAILABLE;
  }
}

function drawStadium(
  ctx: CanvasRenderingContext2D,
  layout: readonly Seat[],
  statusByKey: ReadonlyMap<string, SeatStatus>,
  heldKeys: ReadonlySet<string>,
  hovered: Seat | null,
  selected: Seat | null,
  scale: number,
  dpr: number,
) {
  ctx.save();
  ctx.scale(scale * dpr, scale * dpr);

  // Background
  ctx.fillStyle = STAND_FILL_BASE;
  ctx.fillRect(0, 0, STADIUM_WIDTH, STADIUM_HEIGHT);

  // Stand bands — one translucent ring per stand to anchor seats. The
  // stand name is drawn UNDER the seats on the inner edge of its band
  // (between the band and the pitch) so it reads like a stadium-deck
  // label, not an orbiting tag.
  ctx.save();
  for (const stand of STANDS) {
    const a1 = vToRad(stand.vStart);
    let a2 = vToRad(stand.vEnd);
    if (a2 <= a1) a2 += Math.PI * 2;
    const innerR = stand.innerR - 6;
    const outerR = stand.innerR + stand.rows * ROW_SPACING + 8;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, outerR, a1, a2);
    ctx.arc(CENTER_X, CENTER_Y, innerR, a2, a1, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 133, 202, 0.10)";
    ctx.fill();

    // Curved stand-name label, underlaid in the band.
    const labelR = stand.innerR + 4;
    const mid = (a1 + a2) / 2;
    const span = a2 - a1;
    const flip = Math.sin(mid) > 0; // bottom half — keep text upright
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(mid + (flip ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "800 9px 'Barlow Condensed', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Tighten when the arc is too narrow for the full name.
    const arcLength = labelR * span;
    const text = stand.name.toUpperCase();
    const upright = flip ? labelR + 4 : -(labelR + 4);
    ctx.fillText(text, 0, upright, Math.min(arcLength - 4, 200));
    ctx.restore();
  }
  ctx.restore();

  // Circular pitch — 2 concentric rings (outer field + inner ring),
  // EDGBASTON wordmark dead-centre. Matches the v4 mock.
  const pitchOuterR = 105;
  const pitchInnerR = 60;
  ctx.fillStyle = "#0c4a2a";
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, pitchOuterR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.30)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, pitchInnerR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();

  // EDGBASTON wordmark, dead centre.
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 14px 'Barlow Condensed', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EDGBASTON", CENTER_X, CENTER_Y);
  ctx.restore();

  // Seats
  for (const seat of layout) {
    const status =
      statusByKey.get(statusKey(seat.standId, seat.rowIndex, seat.colIndex)) ??
      "available";
    const isHeld = heldKeys.has(
      statusKey(seat.standId, seat.rowIndex, seat.colIndex),
    );
    const visual = visualForSeat(status, isHeld);
    ctx.beginPath();
    ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = fillForVisual(visual);
    ctx.fill();
  }

  // Hover highlight
  if (hovered) {
    ctx.beginPath();
    ctx.arc(hovered.x, hovered.y, SEAT_RADIUS + 2, 0, Math.PI * 2);
    ctx.fillStyle = SEAT_HOVER;
    ctx.fill();
  }

  // Selected ring
  if (selected) {
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, SEAT_RADIUS + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = SEAT_SELECTED;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.restore();
}

const HIT_RADIUS = SEAT_RADIUS * 2.5;

function findSeatAt(
  layout: readonly Seat[],
  x: number,
  y: number,
): Seat | null {
  let best: { seat: Seat; dist: number } | null = null;
  for (const seat of layout) {
    const dist = Math.hypot(seat.x - x, seat.y - y);
    if (!best || dist < best.dist) best = { seat, dist };
  }
  return best && best.dist <= HIT_RADIUS ? best.seat : null;
}

function describeSeat(seat: Seat): string {
  const stand = STANDS.find((s) => s.id === seat.standId);
  const standName = stand?.name ?? seat.standId;
  return `${standName}, row ${seat.rowIndex + 1}, seat ${seat.colIndex + 1}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (data === "seat_held")
      return "Someone else is taking that seat right now.";
    if (data === "seat_unavailable") return "That seat has just been claimed.";
    if (data === "unauthenticated") return "Sign in first.";
    if (typeof data === "string") return data;
  }
  if (error instanceof Error) return error.message;
  return "Couldn't take that seat.";
}

export function StadiumCanvas({ onSeatClaimed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seatRows = useQuery(api.seats.list);
  const heldIds = useQuery(api.holds.activeSeatIds);
  const claimSeat = useMutation(api.holds.claim);
  const router = useRouter();
  const clientHoldId = useClientHoldId();

  const layout = useMemo(() => buildAllSeats(STANDS), []);

  const statusByKey = useMemo(() => {
    const map = new Map<string, SeatStatus>();
    for (const seat of seatRows ?? []) {
      map.set(statusKey(seat.stand, seat.row, seat.num), seat.status);
    }
    return map;
  }, [seatRows]);

  const idByKey = useMemo(() => {
    const map = new Map<string, Id<"seats">>();
    for (const seat of seatRows ?? []) {
      map.set(statusKey(seat.stand, seat.row, seat.num), seat._id);
    }
    return map;
  }, [seatRows]);

  const heldKeys = useMemo(() => {
    const set = new Set<string>();
    if (!heldIds || !seatRows) return set;
    const idToRow = new Map(seatRows.map((row) => [row._id, row]));
    for (const id of heldIds) {
      const row = idToRow.get(id);
      if (row) set.add(statusKey(row.stand, row.row, row.num));
    }
    return set;
  }, [heldIds, seatRows]);

  const [selected, setSelected] = useState<Seat | null>(null);
  const [hovered, setHovered] = useState<Seat | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = Math.min(wrap.clientWidth || STADIUM_WIDTH, STADIUM_WIDTH);
      const scale = w / STADIUM_WIDTH;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(STADIUM_HEIGHT * scale * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${Math.round(STADIUM_HEIGHT * scale)}px`;
      drawStadium(
        ctx,
        layout,
        statusByKey,
        heldKeys,
        hovered,
        selected,
        scale,
        dpr,
      );
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [layout, statusByKey, heldKeys, hovered, selected]);

  const onCanvasMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / STADIUM_WIDTH;
    if (scale <= 0) return;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const hit = findSeatAt(layout, x, y);
    setHovered(hit);
    if (hit) {
      setTooltipPos({
        left: hit.x * scale,
        top: hit.y * scale - SEAT_RADIUS - 12,
      });
    } else {
      setTooltipPos(null);
    }
  };

  const onCanvasLeave = () => {
    setHovered(null);
    setTooltipPos(null);
  };

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / STADIUM_WIDTH;
    if (scale <= 0) return;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const hit = findSeatAt(layout, x, y);
    if (hit) {
      const status = statusByKey.get(
        statusKey(hit.standId, hit.rowIndex, hit.colIndex),
      );
      if (status === "taken") {
        // Click-through to the public share card. The donate flow
        // never starts on a taken seat — that's a dead end UX.
        router.push(
          `/seat/${hit.standId}-${hit.rowIndex + 1}-${hit.colIndex + 1}`,
        );
        return;
      }
      setError(null);
    }
    setSelected(hit);
  };

  const takeSeat = async () => {
    if (!selected) return;
    if (!clientHoldId) {
      setError("Still warming up. Try again in a moment.");
      return;
    }
    const seatId = idByKey.get(
      statusKey(selected.standId, selected.rowIndex, selected.colIndex),
    );
    if (!seatId) {
      setError("Seats are still loading. Try again in a moment.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await claimSeat({ seatId, clientHoldId });
      onSeatClaimed?.(seatId);
      setSelected(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const tooltipText = hovered ? describeSeat(hovered) : null;
  const tooltipStatus = hovered
    ? heldKeys.has(
        statusKey(hovered.standId, hovered.rowIndex, hovered.colIndex),
      )
      ? "Held — someone's paying"
      : statusByKey.get(
            statusKey(hovered.standId, hovered.rowIndex, hovered.colIndex),
          ) === "taken"
        ? "Taken"
        : "Available · £10"
    : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <header className="text-center">
        <h2 className="font-display text-xl text-white">
          Claim your virtual seat
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/70">
          Click any seat to turn it Blue for Bob. Every seat changes colour when
          claimed. You&apos;re also welcome to make a donation if your seat has
          already gone.
        </p>
      </header>

      <div ref={wrapRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          onMouseMove={onCanvasMove}
          onMouseLeave={onCanvasLeave}
          aria-label="Edgbaston seat map. Click a seat to select it."
          role="img"
          className="block h-auto w-full cursor-pointer rounded-2xl"
        />
        {tooltipPos && tooltipText ? (
          <div
            role="tooltip"
            data-testid="seat-tooltip"
            className="font-display bg-bwf-navy ring-bwf-blue pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-[11px] tracking-wider whitespace-nowrap text-white ring-1"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            {tooltipText}
            <span className="text-bwf-gold ml-2">{tooltipStatus}</span>
          </div>
        ) : null}
      </div>

      <div
        aria-live="polite"
        className="ring-bwf-blue/30 flex w-full flex-col gap-3 rounded-xl bg-white/5 p-4 ring-1"
      >
        {selected ? (
          <>
            <p className="text-sm" data-testid="selected-seat-readout">
              Selected: <strong>{describeSeat(selected)}</strong>
            </p>
            <button
              type="button"
              onClick={takeSeat}
              disabled={submitting || !clientHoldId}
              className="font-display bg-bwf-blue hover:bg-bwf-blue-light self-start rounded-full px-6 py-2.5 text-sm tracking-wider text-white transition-colors disabled:opacity-50"
            >
              {submitting ? "Taking your seat…" : "Take this seat"}
            </button>
          </>
        ) : (
          <p className="text-sm text-white/60">
            Click a seat on the map to select it.
          </p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-amber-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
