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
