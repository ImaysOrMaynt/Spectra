// Core domain types shared between the Spectra server and client.

export type Team = "A" | "B";

/**
 * Game phases form a small state machine:
 *   lobby -> clue -> guess -> bet -> reveal -> (clue | over)
 * `over` returns to `lobby` on restart.
 */
export type Phase = "lobby" | "clue" | "guess" | "bet" | "reveal" | "over";

/** Which side of the locked guess the real target sits on. */
export type Side = "left" | "right";

/** A spectrum card: two opposing concepts at each end of the dial. */
export interface SpectrumCard {
  left: string;
  right: string;
}

/** A host-authored custom spectrum pair, with an id for removal. */
export interface CustomPair extends SpectrumCard {
  id: string;
}

/** Per-room, host-configurable settings. */
export interface RoomSettings {
  /** Points needed to win. */
  targetScore: number;
  /** Whether the built-in deck is mixed into the draw pile. */
  useDefaultDeck: boolean;
}

/** A player as seen by other clients (no secret data). */
export interface PlayerView {
  id: string;
  name: string;
  team: Team | null;
  connected: boolean;
  isHost: boolean;
}

/** Outcome of a single round, shown during the reveal phase. */
export interface RoundResult {
  activeTeam: Team;
  psychicId: string;
  card: SpectrumCard;
  clue: string;
  /** True hidden target position, 0..100. */
  target: number;
  /** Where the guessing team locked the dial, 0..100. */
  guess: number;
  /** Points the active (guessing) team earned, 0..4. */
  zoneScore: number;
  /** The side the opposing team bet, if any. */
  bet: Side | null;
  /** The side the target actually fell on relative to the guess. */
  correctSide: Side | null;
  /** Whether the opposing team won the +1 left/right bonus. */
  betWon: boolean;
  /** Scores after this round was tallied. */
  scores: Record<Team, number>;
}

export interface ChatMessage {
  id: string;
  name: string;
  team: Team | null;
  text: string;
  system?: boolean;
  ts: number;
}

/**
 * The full game state as personalized for a single recipient. The server
 * builds one of these per player so that the secret `target` is only ever
 * sent to the psychic (and to everyone once the round is revealed).
 */
export interface GameStateView {
  code: string;
  phase: Phase;
  hostId: string;
  players: PlayerView[];
  settings: RoomSettings;
  customPairs: CustomPair[];
  scores: Record<Team, number>;
  round: number;
  activeTeam: Team | null;
  psychicId: string | null;
  /** The two ends of the current spectrum (both teams may see this). */
  card: SpectrumCard | null;
  /** The psychic's clue, once submitted. */
  clue: string | null;
  /** Current/locked dial position, 0..100. */
  dial: number;
  guessLocked: boolean;
  /** The resolved bet (shown at reveal); null while voting or if no votes. */
  bet: Side | null;
  /** Live left/right vote tally during the bet (and final at reveal). */
  betCounts: { left: number; right: number } | null;
  /** How many connected opposing players are eligible to vote. */
  betEligible: number;
  /** The recipient's own current vote, if they've cast one. */
  myBet: Side | null;
  /** Secret target, 0..100 — only present for the psychic, or at reveal/over. */
  target: number | null;
  result: RoundResult | null;
  /** How many cards are available in the active deck. */
  deckSize: number;
  /** Seconds remaining on the current auto-advance timer, if any. */
  timer: number | null;
  /** Identity + role of the recipient. */
  you: {
    id: string;
    team: Team | null;
    isHost: boolean;
    isPsychic: boolean;
  };
}
