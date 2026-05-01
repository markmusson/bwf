import { STANDS } from "./stands";

// Human-typeable seat slug: "<standId>-<row1>-<num1>". Row and seat
// numbers are 1-indexed in the URL because that's how a person reads
// them off a row marker. Internally we store 0-indexed.

export interface SeatCoord {
  stand: string;
  row: number;
  num: number;
}

export function parseSeatSlug(slug: string): SeatCoord | null {
  const match = slug.match(/^([a-z][a-z0-9]*)-(\d+)-(\d+)$/i);
  if (!match) return null;
  const [, stand, rowRaw, numRaw] = match;
  if (!stand || !rowRaw || !numRaw) return null;
  if (!STANDS.some((s) => s.id === stand)) return null;
  const row1 = Number(rowRaw);
  const num1 = Number(numRaw);
  if (
    !Number.isInteger(row1) ||
    !Number.isInteger(num1) ||
    row1 <= 0 ||
    num1 <= 0
  ) {
    return null;
  }
  return { stand, row: row1 - 1, num: num1 - 1 };
}

export function formatSeatSlug(coord: SeatCoord): string {
  return `${coord.stand}-${coord.row + 1}-${coord.num + 1}`;
}
