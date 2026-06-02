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

    // Stand-name label sits at the band's mid-arc point. Drawn upright
    // (no canvas rotation) so every label reads left-to-right rather
    // than upside down on the top of the stadium.
    const mid = (a1 + a2) / 2;
    const span = a2 - a1;
    const labelR = stand.innerR + (stand.rows * ROW_SPACING) / 2;
    const lx = CENTER_X + labelR * Math.cos(mid);
    const ly = CENTER_Y + labelR * Math.sin(mid);
    const arcLength = labelR * span;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "800 11px 'Barlow Condensed', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      stand.name.toUpperCase(),
      lx,
      ly,
      Math.min(arcLength - 6, 200),
    );
    ctx.restore();
  }
  ctx.restore();

  // Circular pitch — 2 concentric rings. The BWF logo + EDGBASTON
  // label are overlaid as DOM elements (see the wrap div below) so we
  // can use the SVG directly without canvas image-loading gymnastics.
  const pitchOuterR = 110;
  const pitchInnerR = 64;
  ctx.fillStyle = "#0d5230";
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, pitchOuterR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, pitchInnerR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.stroke();

  // Seats
  for (const seat of layout) {
    const key = statusKey(seat.standId, seat.rowIndex, seat.colIndex);
    const status = statusByKey.get(key) ?? "available";
    const isHeld = heldKeys.has(key);
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
  const actionPanelRef = useRef<HTMLDivElement>(null);
  const seatRows = useQuery(api.seats.list);
  const heldIds = useQuery(api.holds.activeSeatIds);
  const tributeGroups = useQuery(api.tributes.listApproved);
  const claimSeat = useMutation(api.holds.claim);
  const clientHoldId = useClientHoldId();
  const router = useRouter();

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

  // Map of (stand:row:num) → newest approved tribute on that seat.
  // Used by the hover tooltip so a hovered claimed seat shows its
  // dedication. Empty for seats with no approved tributes.
  const leadTributeByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        displayName: string | null;
        recipientName: string | null;
        text: string;
      }
    >();
    if (!tributeGroups) return map;
    for (const group of tributeGroups) {
      const lead = group.tributes[0];
      if (!lead) continue;
      const key = statusKey(group.seat.stand, group.seat.row, group.seat.num);
      map.set(key, {
        displayName: lead.displayName,
        recipientName: lead.recipientName ?? null,
        text: lead.text,
      });
    }
    return map;
  }, [tributeGroups]);

  const [selected, setSelected] = useState<Seat | null>(null);
  const [hovered, setHovered] = useState<Seat | null>(null);

  // Mobile bug fix: tapping a seat selects it, but the action panel
  // sits below the canvas off-screen. Donors then tap the gold status
  // text in the tooltip thinking it's the CTA. Scrolling the panel
  // into view after selection puts the real button under the thumb.
  useEffect(() => {
    if (!selected) return;
    const node = actionPanelRef.current;
    if (!node || typeof node.scrollIntoView !== "function") return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);
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
      // Fill the full wrap width — STADIUM_WIDTH is the internal
      // geometry coordinate space, not a CSS-pixel cap. The DPR
      // multiplier on canvas.width keeps the canvas pixel-sharp at
      // any rendered size.
      const w = wrap.clientWidth || STADIUM_WIDTH;
      const scale = w / STADIUM_WIDTH;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(STADIUM_HEIGHT * scale * dpr);
      canvas.style.width = "100%";
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
        // Single-claim model: a taken seat is read-only. Send the
        // visitor to the seat's share card so they can read the
        // tribute and donate to a different seat instead.
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
  const tooltipStatus = (() => {
    if (!hovered) return null;
    const key = statusKey(hovered.standId, hovered.rowIndex, hovered.colIndex);
    const status = statusByKey.get(key) ?? "available";
    if (heldKeys.has(key) && status !== "taken")
      return "Held — someone's paying";
    if (status === "taken") return "Claimed · tap to view";
    return "Tap to claim · £10";
  })();
  const tooltipTribute = (() => {
    if (!hovered) return null;
    const key = statusKey(hovered.standId, hovered.rowIndex, hovered.colIndex);
    const lead = leadTributeByKey.get(key);
    if (!lead) return null;
    // Truncate hard at 90 chars so the tooltip stays on one viewport line.
    const text =
      lead.text.length > 90
        ? `${lead.text.slice(0, 89).trimEnd()}…`
        : lead.text;
    // "In tribute to <recipient> · by <donor>" when both present so the
    // hover line names the dedicatee AND the donor; falls back to just
    // the donor when no recipient was given.
    const donor = lead.displayName ?? "Anonymous";
    const name = lead.recipientName
      ? `In tribute to ${lead.recipientName} · by ${donor}`
      : donor;
    return { name, text };
  })();

  return (
    <div className="flex flex-col items-center gap-4">
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
        {/* Central visual moment — BWF mark + EDGBASTON wordmark
            sit on the inner pitch ring. Positioned in canvas-coord
            percentages so it scales with the canvas wrapper. */}
        <div
          aria-hidden
          className="pointer-events-none absolute flex flex-col items-center"
          style={{
            // CENTER_X / STADIUM_WIDTH = 340/680 = 50%
            // CENTER_Y / STADIUM_HEIGHT = 285/540 ≈ 52.78%
            left: "50%",
            top: "52.78%",
            transform: "translate(-50%, -50%)",
            // Logo box scales with the canvas. 64 / 680 ≈ 9.4%
            width: "9.4%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/bwf-logo-square.svg"
            alt=""
            className="block w-full opacity-95"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
          />
          <span
            className="font-display mt-1 text-[clamp(8px,1vw,11px)] font-extrabold tracking-[0.2em] text-white/90 uppercase"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
          >
            Edgbaston
          </span>
        </div>
        {tooltipPos && tooltipText ? (
          <div
            role="tooltip"
            data-testid="seat-tooltip"
            className="bg-bwf-navy ring-bwf-blue pointer-events-none absolute z-10 w-[240px] -translate-x-1/2 -translate-y-full rounded-lg px-3 py-2 text-[11px] text-white ring-1"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            <div className="font-display tracking-wider uppercase">
              {tooltipText}
            </div>
            <div className="font-display text-bwf-gold mt-0.5 text-[10px] tracking-wider uppercase">
              {tooltipStatus}
            </div>
            {tooltipTribute ? (
              <div className="border-bwf-blue/30 mt-2 flex flex-col gap-0.5 border-t pt-2">
                <span className="font-display text-bwf-pale text-[9px] tracking-[1.5px] uppercase">
                  {tooltipTribute.name}
                </span>
                <span className="text-[12px] leading-snug text-white/95">
                  “{tooltipTribute.text}”
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        ref={actionPanelRef}
        aria-live="polite"
        className="ring-bwf-blue/30 flex w-full flex-col gap-3 rounded-xl bg-white/5 p-4 ring-1"
      >
        {selected ? (
          <>
            <p className="text-sm" data-testid="selected-seat-readout">
              Selected: <strong>{describeSeat(selected)}</strong>
            </p>
            <p className="font-display text-bwf-gold text-[12px] font-bold tracking-[2px] uppercase">
              Tap below to claim this seat
            </p>
            <button
              type="button"
              onClick={takeSeat}
              disabled={submitting || !clientHoldId}
              className="font-display bg-bwf-gold ring-bwf-gold/50 hover:bg-bwf-gold/90 w-full rounded-full px-6 py-4 text-base font-black tracking-[1.5px] text-bwf-navy uppercase shadow-lg ring-2 transition-colors disabled:opacity-50 sm:py-3.5"
            >
              {submitting ? "Claiming your seat…" : "Take this seat"}
            </button>
          </>
        ) : (
          <p className="text-sm text-white/80">
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
