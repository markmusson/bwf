"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

function statusKey(stand: string, row: number, num: number): string {
  return `${stand}:${row}:${num}`;
}

function drawStadium(
  ctx: CanvasRenderingContext2D,
  layout: readonly Seat[],
  statusByKey: ReadonlyMap<string, SeatStatus>,
  selected: Seat | null,
  scale: number,
  dpr: number,
) {
  ctx.save();
  ctx.scale(scale * dpr, scale * dpr);
  ctx.fillStyle = "#001b3d";
  ctx.fillRect(0, 0, STADIUM_WIDTH, STADIUM_HEIGHT);

  ctx.fillStyle = "#0c4a2a";
  ctx.beginPath();
  ctx.ellipse(CENTER_X, CENTER_Y, 110, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (const stand of STANDS) {
    const a1 = vToRad(stand.vStart);
    let a2 = vToRad(stand.vEnd);
    if (a2 <= a1) a2 += Math.PI * 2;
    const innerR = stand.innerR - 4;
    const outerR = stand.innerR + stand.rows * ROW_SPACING + 6;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, outerR, a1, a2);
    ctx.arc(CENTER_X, CENTER_Y, innerR, a2, a1, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 133, 202, 0.08)";
    ctx.fill();
  }

  for (const seat of layout) {
    const status =
      statusByKey.get(statusKey(seat.standId, seat.rowIndex, seat.colIndex)) ??
      "available";
    ctx.beginPath();
    ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = status === "taken" ? "#0085ca" : "rgba(255,255,255,0.18)";
    ctx.fill();
  }

  if (selected) {
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, SEAT_RADIUS + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
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

export function StadiumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seatRows = useQuery(api.seats.list);
  const claimSeat = useMutation(api.holds.claim);
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
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

  const [selected, setSelected] = useState<Seat | null>(null);
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
      drawStadium(ctx, layout, statusByKey, selected, scale, dpr);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [layout, statusByKey, selected]);

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / STADIUM_WIDTH;
    if (scale <= 0) return;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const hit = findSeatAt(layout, x, y);
    setSelected(hit);
    if (hit) setError(null);
  };

  const takeSeat = async () => {
    if (!selected) return;
    if (!isAuthenticated) {
      router.push("/signin");
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
      await claimSeat({ seatId });
      router.push("/donate");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = seatRows === undefined;
  const seatCount = seatRows?.length ?? 0;

  return (
    <div className="bg-bwf-deep flex min-h-screen flex-col items-center gap-4 px-4 py-8 text-white">
      <header className="flex w-full max-w-3xl flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Edgbaston · Blue for Bob
        </h1>
        <p
          className="text-sm text-white/70"
          aria-live="polite"
          data-testid="seat-count-readout"
        >
          {loading
            ? "Loading the stadium…"
            : `${seatCount.toLocaleString("en-GB")} seats in play.`}
        </p>
      </header>

      <div ref={wrapRef} className="w-full max-w-3xl">
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          aria-label="Edgbaston seat map. Click a seat to select it."
          role="img"
          className="block h-auto w-full cursor-pointer rounded-2xl"
        />
      </div>

      <div
        aria-live="polite"
        className="ring-bwf-blue/30 flex w-full max-w-3xl flex-col gap-3 rounded-xl bg-white/5 p-4 ring-1"
      >
        {selected ? (
          <>
            <p className="text-sm" data-testid="selected-seat-readout">
              Selected: <strong>{describeSeat(selected)}</strong>
            </p>
            <button
              type="button"
              onClick={takeSeat}
              disabled={submitting || authLoading}
              className="bg-bwf-blue hover:bg-bwf-accent self-start rounded-full px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {submitting
                ? "Taking your seat…"
                : isAuthenticated
                  ? "Take this seat"
                  : "Sign in to take this seat"}
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
