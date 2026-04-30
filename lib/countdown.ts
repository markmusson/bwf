// Countdown derivation. Pure so the UI component stays simple and the
// maths is unit-testable.

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  reached: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const SECOND = 1000;

export function computeCountdown(
  targetMs: number,
  nowMs: number,
): CountdownParts {
  const remaining = targetMs - nowMs;
  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, reached: true };
  }
  const days = Math.floor(remaining / DAY);
  const hours = Math.floor((remaining % DAY) / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);
  const seconds = Math.floor((remaining % MINUTE) / SECOND);
  return { days, hours, minutes, seconds, reached: false };
}
