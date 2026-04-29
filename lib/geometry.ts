export const STADIUM_WIDTH = 680;
export const STADIUM_HEIGHT = 500;
export const CENTER_X = 340;
export const CENTER_Y = 252;
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
