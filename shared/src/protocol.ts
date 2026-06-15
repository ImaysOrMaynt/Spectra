import type {
  ChatMessage,
  GameStateView,
  RoomSettings,
  Side,
  Team,
} from "./types.js";

/** Standard ack callback used for request/response style events. */
export type Ack<T> = (
  res: { ok: true; data: T } | { ok: false; error: string },
) => void;

export interface JoinResult {
  code: string;
  /** The recipient's player id. */
  you: string;
}

/** Events the client sends to the server. */
export interface ClientToServerEvents {
  "room:create": (p: { name: string }, cb: Ack<JoinResult>) => void;
  "room:join": (p: { name: string; code: string }, cb: Ack<JoinResult>) => void;
  "team:switch": (p: { team: Team }) => void;
  "settings:update": (p: Partial<RoomSettings>) => void;
  "pair:add": (p: { left: string; right: string }) => void;
  "pair:remove": (p: { id: string }) => void;
  "game:start": () => void;
  "clue:submit": (p: { clue: string }) => void;
  "dial:move": (p: { position: number }) => void;
  "guess:lock": (p: { position: number }) => void;
  "bet:submit": (p: { side: Side }) => void;
  "round:next": () => void;
  "host:skip": () => void;
  "game:restart": () => void;
  "chat:send": (p: { text: string }) => void;
}

/** Events the server sends to the client. */
export interface ServerToClientEvents {
  /** Authoritative, per-player game state. Sent after every change. */
  state: (s: GameStateView) => void;
  /** Lightweight live dial position during active guessing (smooth needle). */
  "dial:live": (p: { position: number }) => void;
  chat: (m: ChatMessage) => void;
  /** A transient, non-fatal notice. */
  toast: (p: { message: string }) => void;
}
