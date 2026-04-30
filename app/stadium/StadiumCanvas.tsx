"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { api } from "@/convex/_generated/api";
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
  scale: number,
  dpr: number,
) {
  ctx.save();
  ctx.scale(scale * dpr, scale * dpr);
  ctx.fillStyle = "#001b3d";
  ctx.fillRect(0, 0, STADIUM_WIDTH, STADIUM_HEIGHT);

  // Pitch oval — sketchy but enough to anchor the eye.
  ctx.fillStyle = "#0c4a2a";
  ctx.beginPath();
  ctx.ellipse(CENTER_X, CENTER_Y, 110, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Stand bands — a translucent ring per stand to anchor the seat clusters.
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

  // Seats.
  for (const seat of layout) {
    const status =
      statusByKey.get(statusKey(seat.standId, seat.rowIndex, seat.colIndex)) ??
      "available";
    ctx.beginPath();
    ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = status === "taken" ? "#0085ca" : "rgba(255,255,255,0.18)";
    ctx.fill();
  }

  ctx.restore();
}

export function StadiumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seatRows = useQuery(api.seats.list);

  const layout = useMemo(() => buildAllSeats(STANDS), []);

  const statusByKey = useMemo(() => {
    const map = new Map<string, SeatStatus>();
    for (const seat of seatRows ?? []) {
      map.set(statusKey(seat.stand, seat.row, seat.num), seat.status);
    }
    return map;
  }, [seatRows]);

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
      drawStadium(ctx, layout, statusByKey, scale, dpr);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [layout, statusByKey]);

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
          aria-label="Edgbaston seat map"
          role="img"
          className="block h-auto w-full rounded-2xl"
        />
      </div>
    </div>
  );
}
