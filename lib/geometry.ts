export function vToRad(visualDegrees: number): number {
  return ((visualDegrees - 90) * Math.PI) / 180;
}
