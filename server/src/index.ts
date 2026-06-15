import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { Server, type DefaultEventsMap } from "socket.io";

import {
  MAX_CHAT_LENGTH,
  type ChatMessage,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type Team,
} from "@spectra/shared";

import { generateCode } from "./codes.js";
import { Room, type ActionResult } from "./room.js";

const PORT = Number(process.env.PORT ?? 3001);
const MAX_ROOM_SIZE = 16;

interface SocketData {
  code?: string;
  playerId?: string;
}

const rooms = new Map<string, Room>();
const revealTimers = new Map<string, NodeJS.Timeout>();

// ---- HTTP --------------------------------------------------------------

const app = express();
app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// In production, serve the built client (run `npm run build` first).
const clientDist = path.resolve(
  fileURLToPath(new URL("../../client/dist", import.meta.url)),
);
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>(httpServer, {
  cors: { origin: true },
});

// ---- helpers -----------------------------------------------------------

const otherTeam = (team: Team): Team => (team === "A" ? "B" : "A");

/** Send each connected player their personalized view, then sync timers. */
function broadcast(room: Room): void {
  for (const r of room.recipients()) {
    io.to(r.socketId).emit("state", room.viewFor(r.id));
  }
  reconcileTimer(room);
}

function systemChat(room: Room, text: string): void {
  const msg: ChatMessage = {
    id: randomUUID(),
    name: "system",
    team: null,
    text,
    system: true,
    ts: Date.now(),
  };
  io.to(room.code).emit("chat", msg);
}

function winnerText(room: Room): string {
  const w = room.winner();
  if (!w) return "Game over.";
  return `Team ${w} wins ${room.scores[w]}–${room.scores[otherTeam(w)]}!`;
}

/** Keep the reveal auto-advance timer in sync with the room's phase. */
function reconcileTimer(room: Room): void {
  const existing = revealTimers.get(room.code);
  if (room.phase === "reveal" && room.revealDeadline) {
    if (existing) return;
    const delay = Math.max(0, room.revealDeadline - Date.now()) + 50;
    const timer = setTimeout(() => {
      revealTimers.delete(room.code);
      const res = room.advance();
      if (res.ok) {
        if (room.phase === "over") systemChat(room, winnerText(room));
        broadcast(room);
      }
    }, delay);
    revealTimers.set(room.code, timer);
  } else if (existing) {
    clearTimeout(existing);
    revealTimers.delete(room.code);
  }
}

function resultSummary(room: Room): string | null {
  const r = room.lastResult;
  if (!r) return null;
  const bonus = r.betWon ? ` • Team ${otherTeam(r.activeTeam)} nailed the side (+1)` : "";
  return `Team ${r.activeTeam} scored ${r.zoneScore}${bonus}.`;
}

// ---- socket wiring -----------------------------------------------------

io.on("connection", (socket) => {
  const roomOf = (): Room | undefined =>
    socket.data.code ? rooms.get(socket.data.code) : undefined;

  /** Run a room mutation, surface errors as a toast, broadcast on success. */
  function act(
    fn: (room: Room, playerId: string) => ActionResult,
    onOk?: (room: Room) => void,
  ): void {
    const room = roomOf();
    const playerId = socket.data.playerId;
    if (!room || !playerId) {
      socket.emit("toast", { message: "You're not in a room." });
      return;
    }
    const res = fn(room, playerId);
    if (!res.ok) {
      socket.emit("toast", { message: res.error });
      return;
    }
    onOk?.(room);
    broadcast(room);
  }

  socket.on("room:create", ({ name }, cb) => {
    try {
      const code = generateCode((c) => rooms.has(c));
      const room = new Room(code);
      rooms.set(code, room);
      const player = room.addPlayer(name, socket.id);
      socket.data.code = code;
      socket.data.playerId = player.id;
      socket.join(code);
      cb({ ok: true, data: { code, you: player.id } });
      broadcast(room);
    } catch {
      cb({ ok: false, error: "Could not create a room. Try again." });
    }
  });

  socket.on("room:join", ({ name, code }, cb) => {
    const normalized = String(code ?? "").toUpperCase().trim();
    const room = rooms.get(normalized);
    if (!room) {
      cb({ ok: false, error: "No room with that code." });
      return;
    }
    if (room.size >= MAX_ROOM_SIZE) {
      cb({ ok: false, error: "That room is full." });
      return;
    }
    const player = room.addPlayer(name, socket.id);
    socket.data.code = normalized;
    socket.data.playerId = player.id;
    socket.join(normalized);
    cb({ ok: true, data: { code: normalized, you: player.id } });
    systemChat(room, `${player.name} joined.`);
    broadcast(room);
  });

  socket.on("team:switch", ({ team }) => act((r, p) => r.switchTeam(p, team)));
  socket.on("settings:update", (patch) => act((r, p) => r.updateSettings(p, patch)));
  socket.on("pair:add", ({ left, right }) => act((r, p) => r.addPair(p, left, right)));
  socket.on("pair:remove", ({ id }) => act((r, p) => r.removePair(p, id)));

  socket.on("game:start", () =>
    act(
      (r, p) => r.startGame(p),
      (r) => systemChat(r, "The game has begun — good luck!"),
    ),
  );

  socket.on("clue:submit", ({ clue }) => act((r, p) => r.submitClue(p, clue)));
  socket.on("guess:lock", ({ position }) => act((r, p) => r.lockGuess(p, position)));

  socket.on("bet:submit", ({ side }) =>
    act(
      (r, p) => r.submitBet(p, side),
      (r) => {
        const summary = resultSummary(r);
        if (summary) systemChat(r, summary);
      },
    ),
  );

  socket.on("round:next", () =>
    act(
      (r, p) => r.advance(p),
      (r) => {
        if (r.phase === "over") systemChat(r, winnerText(r));
      },
    ),
  );

  socket.on("host:skip", () =>
    act(
      (r, p) => r.skip(p),
      (r) => systemChat(r, "Host skipped the round."),
    ),
  );

  socket.on("game:restart", () =>
    act(
      (r, p) => r.restart(p),
      (r) => systemChat(r, "Back to the lobby."),
    ),
  );

  // Live dial dragging: cheap, no full state broadcast, no error toasts.
  socket.on("dial:move", ({ position }) => {
    const room = roomOf();
    const playerId = socket.data.playerId;
    if (!room || !playerId) return;
    if (room.moveDial(playerId, position).ok) {
      socket.to(room.code).emit("dial:live", { position: room.dial });
    }
  });

  socket.on("chat:send", ({ text }) => {
    const room = roomOf();
    const playerId = socket.data.playerId;
    if (!room || !playerId) return;
    const player = room.getPlayer(playerId);
    const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT_LENGTH);
    if (!player || !clean) return;
    const msg: ChatMessage = {
      id: randomUUID(),
      name: player.name,
      team: player.team,
      text: clean,
      ts: Date.now(),
    };
    io.to(room.code).emit("chat", msg);
  });

  socket.on("disconnect", () => {
    const room = roomOf();
    if (!room) return;
    const player = room.markDisconnected(socket.id);
    if (room.size === 0) {
      const timer = revealTimers.get(room.code);
      if (timer) clearTimeout(timer);
      revealTimers.delete(room.code);
      rooms.delete(room.code);
      return;
    }
    if (player) systemChat(room, `${player.name} left.`);
    broadcast(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[spectra] server listening on http://localhost:${PORT}`);
});
