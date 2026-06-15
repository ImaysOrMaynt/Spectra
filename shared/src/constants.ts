import type { Side } from "./types.js";

/** The dial is a 0..100 linear scale (rendered as a 180° semicircle). */
export const DIAL_MIN = 0;
export const DIAL_MAX = 100;

/**
 * Scoring bands, expressed as half-widths (in dial units) out from the
 * hidden target's center. Checked nearest-first: the bullseye scores 4,
 * the next ring 3, the outer ring 2, and anything beyond scores nothing.
 */
export const SCORE_BANDS = [
  { score: 4, halfWidth: 4 },
  { score: 3, halfWidth: 10 },
  { score: 2, halfWidth: 16 },
] as const;

/** The widest scoring band; used to keep generated targets fully on-dial. */
export const MAX_BAND = SCORE_BANDS[SCORE_BANDS.length - 1].halfWidth;

/** Default points needed to win a game. */
export const DEFAULT_TARGET_SCORE = 10;

/** Minimum connected players required on each team to start. */
export const MIN_PLAYERS_PER_TEAM = 2;

/** Seconds the reveal screen lingers before auto-advancing to the next round. */
export const REVEAL_SECONDS = 9;

/** Seconds the opposing team has to vote left/right before the bet resolves. */
export const BET_SECONDS = 20;

export const MAX_NAME_LENGTH = 16;
export const MAX_CLUE_LENGTH = 60;
export const MAX_CHAT_LENGTH = 240;
export const MAX_TERM_LENGTH = 28;

export function clampDial(value: number): number {
  if (Number.isNaN(value)) return (DIAL_MIN + DIAL_MAX) / 2;
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, value));
}

/** Points the guessing team earns for landing `guess` near `target`. */
export function scoreForGuess(target: number, guess: number): number {
  const distance = Math.abs(target - guess);
  for (const band of SCORE_BANDS) {
    if (distance <= band.halfWidth) return band.score;
  }
  return 0;
}

/**
 * Which side of the locked guess the target actually sits on. Returns null
 * when the guess is exactly on target (no left/right bonus is winnable).
 */
export function sideOfTarget(target: number, guess: number): Side | null {
  if (target === guess) return null;
  return target < guess ? "left" : "right";
}

/** Pick a hidden target, kept far enough from the edges to fit every band. */
export function randomTarget(rng: () => number = Math.random): number {
  const span = DIAL_MAX - DIAL_MIN - 2 * MAX_BAND;
  return Math.round((DIAL_MIN + MAX_BAND + rng() * span) * 10) / 10;
}
