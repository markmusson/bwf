// Profanity filter for tributes. Per 06-locked-from-adam.md item 6,
// the policy is: auto-publish if clean, hold for review if flagged.
// This module is the "is it clean?" half — when it returns
// `quarantine`, the tribute stays in `pending` until a human in the
// admin queue clears or rejects it.
//
// Scope is intentionally minimal: a v1 list catches obvious cases.
// We expose `score` so the admin queue can sort worst-first. Swap for
// a vendored service if false-positive / negative rates bite.

export type ModerationOutcome =
  | { decision: "approve"; score: 0 }
  | { decision: "quarantine"; score: number; reasons: readonly string[] };

const BLOCKLIST: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(?:f[\s\W_]*u[\s\W_]*c[\s\W_]*k(?:ing|ed|er|s)?)\b/i,
    reason: "profanity:f-word",
  },
  { pattern: /\bsh[i\W]*t(?:ty|s|ting|ter)?\b/i, reason: "profanity:s-word" },
  { pattern: /\bb[i!1\W]*tch(?:es|ing)?\b/i, reason: "profanity:b-word" },
  { pattern: /\b(?:c[\W_]*u[\W_]*n[\W_]*t)\b/i, reason: "profanity:c-word" },
  {
    pattern: /\b(?:n[\W_]*[i!1][\W_]*g[\W_]*g(?:[ae]|er|a))\b/i,
    reason: "slur:n-word",
  },
  {
    pattern: /\b(?:f[\W_]*[a@][\W_]*g(?:got|gy)?)\b/i,
    reason: "slur:f-word",
  },
  { pattern: /\bk[i!1\W]*k+[i!1\W]*[ae]\b/i, reason: "slur:antisemitic" },
  { pattern: /\bsl[ua][\W]*t(?:s|ty)?\b/i, reason: "profanity:degrading" },
  { pattern: /\bw[h]?[o0]re(?:s)?\b/i, reason: "profanity:degrading" },
  // URLs / emails — not strictly profanity but Adam doesn't want
  // tributes used as a link farm.
  { pattern: /https?:\/\//i, reason: "spam:url" },
  { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, reason: "spam:email" },
];

const MIN_PRINTABLE_LENGTH = 1;
const MAX_LENGTH = 280;

export function moderateTribute(text: string): ModerationOutcome {
  const trimmed = text.trim();
  const reasons: string[] = [];
  let score = 0;

  if (trimmed.length < MIN_PRINTABLE_LENGTH) {
    reasons.push("empty");
    score += 1;
  }
  if (trimmed.length > MAX_LENGTH) {
    reasons.push("too-long");
    score += 1;
  }

  for (const { pattern, reason } of BLOCKLIST) {
    if (pattern.test(trimmed)) {
      reasons.push(reason);
      score += reason.startsWith("slur:") ? 5 : 2;
    }
  }

  // ALL-CAPS shouting — flag when at least 12 letters AND >= 80% of
  // the alphabetic chars are uppercase. Lets short caps like "BWF" or
  // "ODI" pass; catches "STOP THE NONSENSE" or worse.
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  const upper = letters.replace(/[^A-Z]/g, "");
  if (letters.length >= 12 && upper.length / letters.length >= 0.8) {
    reasons.push("style:shouting");
    score += 2;
  }

  if (reasons.length === 0) {
    return { decision: "approve", score: 0 };
  }
  return { decision: "quarantine", score, reasons };
}
