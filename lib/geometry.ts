export const STADIUM_WIDTH = 680;
// 540 instead of 500 so the deepest top stand (Hollies, innerR 133 +
// 13 rows × 10 + label headroom) and the deepest bottom stand (South,
// 10 rows) both fit with a few pixels of breathing room.
export const STADIUM_HEIGHT = 540;
export const CENTER_X = 340;
// Hollies (top) reaches further from the centre than South (bottom),
// so the centre is shifted slightly above mid-canvas to balance the
// margins on each side.
export const CENTER_Y = 285;
export const ROW_SPACING = 10;
export const SEAT_SPACING = 9;
export const SEAT_RADIUS = 3.5;
export const EDGE_BUFFER_DEG = 1.5;
export const DEFAULT_BASE_PRICE_PENCE = 1000;

export type Tier = "premium" | "standard" | "general";

export interface Stand {
  readonly id: string;
  readonly name: string;
  readonly sub: string;
  readonly tier: Tier;
  readonly vStart: number;
  readonly vEnd: number;
  readonly innerR: number;
  readonly rows: number;
}

export interface Seat {
  readonly id: string;
  readonly standId: string;
  readonly rowIndex: number;
  readonly colIndex: number;
  readonly tier: Tier;
  readonly basePricePence: number;
  readonly x: number;
  readonly y: number;
}

export function vToRad(visualDegrees: number): number {
  return ((visualDegrees - 90) * Math.PI) / 180;
}

export function arcSpan(vStart: number, vEnd: number): number {
  const start = vToRad(vStart);
  let end = vToRad(vEnd);
  if (end <= start) {
    end += 2 * Math.PI;
  }
  return end - start;
}

export function buildStandSeats(stand: Stand): Seat[] {
  const startAngle = vToRad(stand.vStart);
  const span = arcSpan(stand.vStart, stand.vEnd);
  const buffer = (EDGE_BUFFER_DEG * Math.PI) / 180;
  const usableSpan = span - 2 * buffer;
  const seats: Seat[] = [];

  for (let row = 0; row < stand.rows; row++) {
    const radius = stand.innerR + row * ROW_SPACING;
    const arcLength = radius * span;
    const colCount = Math.max(1, Math.round(arcLength / SEAT_SPACING));

    for (let col = 0; col < colCount; col++) {
      const fraction = colCount > 1 ? col / (colCount - 1) : 0.5;
      const angle = startAngle + buffer + fraction * usableSpan;
      seats.push({
        id: `${stand.id}_R_${row}_${col}`,
        standId: stand.id,
        rowIndex: row,
        colIndex: col,
        tier: stand.tier,
        basePricePence: DEFAULT_BASE_PRICE_PENCE,
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
      });
    }
  }

  return seats;
}

export function buildAllSeats(stands: readonly Stand[]): Seat[] {
  return stands.flatMap(buildStandSeats);
}
