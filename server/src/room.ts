import { randomUUID } from "node:crypto";
import {
  clampDial,
  DEFAULT_DECK,
  DEFAULT_TARGET_SCORE,
  MAX_CLUE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TERM_LENGTH,
  MIN_PLAYERS_PER_TEAM,
  randomTarget,
  REVEAL_SECONDS,
  scoreForGuess,
  sideOfTarget,
  type CustomPair,
  type GameStateView,
  type Phase,
  type PlayerView,
  type RoomSettings,
  type RoundResult,
  type Side,
  type SpectrumCard,
  type Team,
} from "@spectra/shared";

interface Player {
  id: string;
  name: string;
  team: Team | null;
  connected: boolean;
  socketId: string | null;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

const TEAMS: Team[] = ["A", "B"];
const other = (team: Team): Team => (team === "A" ? "B" : "A");

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A single game room: players, settings, and the round state machine. */
export class Room {
  readonly code: string;
  hostId = "";
  private readonly players = new Map<string, Player>();
  /** Player ids in join order, for stable team lists and psychic rotation. */
  private order: string[] = [];

  settings: RoomSettings = {
    targetScore: DEFAULT_TARGET_SCORE,
    useDefaultDeck: true,
  };
  customPairs: CustomPair[] = [];

  phase: Phase = "lobby";
  round = 0;
  scores: Record<Team, number> = { A: 0, B: 0 };
  activeTeam: Team = "A";
  psychicId: string | null = null;
  private rotation: Record<Team, number> = { A: 0, B: 0 };

  card: SpectrumCard | null = null;
  private target: number | null = null;
  clue: string | null = null;
  dial = 50;
  guessLocked = false;
  bet: Side | null = null;
  private result: RoundResult | null = null;

  private deck: SpectrumCard[] = [];
  /** When the reveal phase should auto-advance (epoch ms), or null. */
  revealDeadline: number | null = null;

  constructor(code: string) {
    this.code = code;
  }

  // ---- player membership -------------------------------------------------

  get size(): number {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  findBySocket(socketId: string): Player | undefined {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }

  /** Connected players paired with their live socket ids, for broadcasting. */
  recipients(): { id: string; socketId: string }[] {
    return [...this.players.values()]
      .filter((p) => p.connected && p.socketId)
      .map((p) => ({ id: p.id, socketId: p.socketId! }));
  }

  get lastResult(): RoundResult | null {
    return this.result;
  }

  private connectedOf(team: Team): Player[] {
    return this.order
      .map((id) => this.players.get(id))
      .filter((p): p is Player => !!p && p.connected && p.team === team);
  }

  private smallerTeam(): Team {
    return this.connectedOf("A").length <= this.connectedOf("B").length ? "A" : "B";
  }

  addPlayer(name: string, socketId: string): Player {
    const id = randomUUID();
    const player: Player = {
      id,
      name: cleanText(name, MAX_NAME_LENGTH) || "Player",
      team: this.phase === "lobby" ? null : this.smallerTeam(),
      connected: true,
      socketId,
    };
    if (this.players.size === 0) this.hostId = id;
    if (this.phase === "lobby" && player.team === null) {
      player.team = this.smallerTeam();
    }
    this.players.set(id, player);
    this.order.push(id);
    return player;
  }

  reconnect(id: string, socketId: string): boolean {
    const player = this.players.get(id);
    if (!player) return false;
    player.connected = true;
    player.socketId = socketId;
    return true;
  }

  /** Mark a player disconnected and repair any roles they were holding. */
  markDisconnected(socketId: string): Player | undefined {
    const player = this.findBySocket(socketId);
    if (!player) return undefined;
    player.connected = false;
    player.socketId = null;
    this.reconcile();
    return player;
  }

  private reconcile(): void {
    // Reassign host if the current host left.
    const host = this.players.get(this.hostId);
    if (!host || !host.connected) {
      const next = this.order.map((id) => this.players.get(id)).find((p) => p?.connected);
      if (next) this.hostId = next.id;
    }

    if (this.phase === "lobby" || this.phase === "over") return;

    // If a whole team emptied mid-game, abort back to the lobby.
    if (this.connectedOf("A").length === 0 || this.connectedOf("B").length === 0) {
      this.toLobby();
      return;
    }

    // If the active psychic dropped before the reveal, hand the role to a
    // remaining teammate so the round can continue.
    if (
      this.psychicId &&
      (this.phase === "clue" || this.phase === "guess" || this.phase === "bet")
    ) {
      const psychic = this.players.get(this.psychicId);
      if (!psychic || !psychic.connected) {
        const replacement = this.connectedOf(this.activeTeam)[0];
        if (replacement) {
          this.psychicId = replacement.id;
          // A fresh psychic can't honour an in-progress clue, so restart it.
          if (this.phase !== "clue") {
            this.phase = "clue";
            this.clue = null;
            this.dial = 50;
            this.guessLocked = false;
            this.bet = null;
          }
        }
      }
    }
  }

  // ---- lobby actions -----------------------------------------------------

  switchTeam(id: string, team: Team): ActionResult {
    if (this.phase !== "lobby") return fail("Teams are locked once the game starts.");
    const player = this.players.get(id);
    if (!player) return fail("Unknown player.");
    if (!TEAMS.includes(team)) return fail("Invalid team.");
    player.team = team;
    return OK;
  }

  updateSettings(id: string, patch: Partial<RoomSettings>): ActionResult {
    const guard = this.requireHostInLobby(id);
    if (!guard.ok) return guard;
    if (typeof patch.targetScore === "number" && Number.isFinite(patch.targetScore)) {
      this.settings.targetScore = Math.min(30, Math.max(3, Math.round(patch.targetScore)));
    }
    if (typeof patch.useDefaultDeck === "boolean") {
      this.settings.useDefaultDeck = patch.useDefaultDeck;
    }
    return OK;
  }

  addPair(id: string, left: string, right: string): ActionResult {
    const guard = this.requireHostInLobby(id);
    if (!guard.ok) return guard;
    const l = cleanText(left, MAX_TERM_LENGTH);
    const r = cleanText(right, MAX_TERM_LENGTH);
    if (!l || !r) return fail("Both ends of the spectrum are required.");
    if (this.customPairs.length >= 100) return fail("Custom pair limit reached.");
    this.customPairs.push({ id: randomUUID(), left: l, right: r });
    return OK;
  }

  removePair(id: string, pairId: string): ActionResult {
    const guard = this.requireHostInLobby(id);
    if (!guard.ok) return guard;
    this.customPairs = this.customPairs.filter((p) => p.id !== pairId);
    return OK;
  }

  private requireHostInLobby(id: string): ActionResult {
    if (id !== this.hostId) return fail("Only the host can do that.");
    if (this.phase !== "lobby") return fail("Only available in the lobby.");
    return OK;
  }

  // ---- deck --------------------------------------------------------------

  private activePairs(): SpectrumCard[] {
    const base = this.settings.useDefaultDeck ? DEFAULT_DECK : [];
    const pairs = [...base, ...this.customPairs.map(({ left, right }) => ({ left, right }))];
    return pairs.length > 0 ? pairs : DEFAULT_DECK;
  }

  deckSize(): number {
    return this.activePairs().length;
  }

  private drawCard(): SpectrumCard {
    if (this.deck.length === 0) {
      this.deck = [...this.activePairs()];
      // Fisher-Yates shuffle.
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    return this.deck.pop()!;
  }

  // ---- game flow ---------------------------------------------------------

  startGame(id: string): ActionResult {
    if (id !== this.hostId) return fail("Only the host can start the game.");
    if (this.phase !== "lobby") return fail("The game has already started.");
    for (const team of TEAMS) {
      if (this.connectedOf(team).length < MIN_PLAYERS_PER_TEAM) {
        return fail(`Each team needs at least ${MIN_PLAYERS_PER_TEAM} players.`);
      }
    }
    this.scores = { A: 0, B: 0 };
    this.rotation = { A: 0, B: 0 };
    this.round = 0;
    this.activeTeam = "A";
    this.deck = [];
    this.beginRound();
    return OK;
  }

  private beginRound(): void {
    this.round += 1;
    this.phase = "clue";
    this.card = this.drawCard();
    this.target = randomTarget();
    this.clue = null;
    this.dial = 50;
    this.guessLocked = false;
    this.bet = null;
    this.result = null;
    this.revealDeadline = null;
    this.psychicId = this.pickPsychic(this.activeTeam);
  }

  private pickPsychic(team: Team): string | null {
    const list = this.connectedOf(team);
    if (list.length === 0) return null;
    return list[this.rotation[team] % list.length].id;
  }

  submitClue(id: string, clue: string): ActionResult {
    if (this.phase !== "clue") return fail("Not accepting clues right now.");
    if (id !== this.psychicId) return fail("Only the psychic can give the clue.");
    const text = cleanText(clue, MAX_CLUE_LENGTH);
    if (!text) return fail("Your clue can't be empty.");
    this.clue = text;
    this.phase = "guess";
    this.dial = 50;
    this.guessLocked = false;
    return OK;
  }

  private isActiveGuesser(id: string): boolean {
    const player = this.players.get(id);
    return !!player && player.team === this.activeTeam && id !== this.psychicId;
  }

  moveDial(id: string, position: number): ActionResult {
    if (this.phase !== "guess" || this.guessLocked) return fail("Dial is locked.");
    if (!this.isActiveGuesser(id)) return fail("Only the guessing team can move the dial.");
    this.dial = clampDial(position);
    return OK;
  }

  lockGuess(id: string, position: number): ActionResult {
    if (this.phase !== "guess") return fail("Not guessing right now.");
    if (!this.isActiveGuesser(id)) return fail("Only the guessing team can lock the guess.");
    this.dial = clampDial(position);
    this.guessLocked = true;
    this.phase = "bet";
    return OK;
  }

  submitBet(id: string, side: Side): ActionResult {
    if (this.phase !== "bet") return fail("Not betting right now.");
    const player = this.players.get(id);
    if (!player || player.team == null || player.team === this.activeTeam) {
      return fail("Only the opposing team can bet left or right.");
    }
    if (side !== "left" && side !== "right") return fail("Invalid bet.");
    this.bet = side;
    this.tally();
    return OK;
  }

  private tally(): void {
    const target = this.target ?? 50;
    const guess = this.dial;
    const zoneScore = scoreForGuess(target, guess);
    const correctSide = sideOfTarget(target, guess);
    const betWon = this.bet != null && correctSide != null && this.bet === correctSide;

    this.scores[this.activeTeam] += zoneScore;
    if (betWon) this.scores[other(this.activeTeam)] += 1;

    this.result = {
      activeTeam: this.activeTeam,
      psychicId: this.psychicId ?? "",
      card: this.card ?? { left: "", right: "" },
      clue: this.clue ?? "",
      target,
      guess,
      zoneScore,
      bet: this.bet,
      correctSide,
      betWon,
      scores: { ...this.scores },
    };
    this.phase = "reveal";
    this.revealDeadline = Date.now() + REVEAL_SECONDS * 1000;
  }

  /** Winner if the target score has been reached, else null. */
  winner(): Team | null {
    const { targetScore } = this.settings;
    const aWins = this.scores.A >= targetScore;
    const bWins = this.scores.B >= targetScore;
    if (aWins && bWins) return this.scores.A >= this.scores.B ? "A" : "B";
    if (aWins) return "A";
    if (bWins) return "B";
    return null;
  }

  advance(id?: string): ActionResult {
    if (this.phase !== "reveal") return fail("Nothing to advance.");
    if (id !== undefined && id !== this.hostId) return fail("Only the host can advance.");
    this.revealDeadline = null;
    if (this.winner()) {
      this.phase = "over";
      return OK;
    }
    this.rotation[this.activeTeam] += 1;
    this.activeTeam = other(this.activeTeam);
    this.beginRound();
    return OK;
  }

  skip(id: string): ActionResult {
    if (id !== this.hostId) return fail("Only the host can skip.");
    if (this.phase === "lobby" || this.phase === "over") return fail("Nothing to skip.");
    this.revealDeadline = null;
    this.rotation[this.activeTeam] += 1;
    this.activeTeam = other(this.activeTeam);
    this.beginRound();
    return OK;
  }

  restart(id: string): ActionResult {
    if (id !== this.hostId) return fail("Only the host can restart.");
    if (this.phase !== "over") return fail("The game is still in progress.");
    this.toLobby();
    return OK;
  }

  private toLobby(): void {
    this.phase = "lobby";
    this.scores = { A: 0, B: 0 };
    this.rotation = { A: 0, B: 0 };
    this.round = 0;
    this.psychicId = null;
    this.card = null;
    this.target = null;
    this.clue = null;
    this.dial = 50;
    this.guessLocked = false;
    this.bet = null;
    this.result = null;
    this.revealDeadline = null;
    this.deck = [];
  }

  // ---- serialization -----------------------------------------------------

  private playerViews(): PlayerView[] {
    return this.order
      .map((id) => this.players.get(id))
      .filter((p): p is Player => !!p)
      .map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        connected: p.connected,
        isHost: p.id === this.hostId,
      }));
  }

  /** Build the state object tailored to a single recipient. */
  viewFor(playerId: string): GameStateView {
    const revealing = this.phase === "reveal" || this.phase === "over";
    const isPsychic = playerId === this.psychicId;
    const me = this.players.get(playerId);
    const timer =
      this.phase === "reveal" && this.revealDeadline
        ? Math.max(0, Math.ceil((this.revealDeadline - Date.now()) / 1000))
        : null;

    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players: this.playerViews(),
      settings: { ...this.settings },
      customPairs: this.customPairs,
      scores: { ...this.scores },
      round: this.round,
      activeTeam: this.phase === "lobby" ? null : this.activeTeam,
      psychicId: this.psychicId,
      card: this.phase === "lobby" ? null : this.card,
      clue: this.clue,
      dial: this.dial,
      guessLocked: this.guessLocked,
      bet: revealing ? this.bet : null,
      target: isPsychic || revealing ? this.target : null,
      result: revealing ? this.result : null,
      deckSize: this.deckSize(),
      timer,
      you: {
        id: playerId,
        team: me?.team ?? null,
        isHost: playerId === this.hostId,
        isPsychic,
      },
    };
  }
}
