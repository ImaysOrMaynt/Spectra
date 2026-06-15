import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  GameStateView,
  JoinResult,
  RoomSettings,
  Side,
  Team,
} from "@spectra/shared";
import { socket } from "./socket.js";

export interface Toast {
  id: number;
  message: string;
}

export interface SpectraActions {
  createRoom: (name: string) => Promise<{ ok: boolean; error?: string }>;
  joinRoom: (name: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  leaveRoom: () => void;
  switchTeam: (team: Team) => void;
  updateSettings: (patch: Partial<RoomSettings>) => void;
  addPair: (left: string, right: string) => void;
  removePair: (id: string) => void;
  startGame: () => void;
  submitClue: (clue: string) => void;
  moveDial: (position: number) => void;
  lockGuess: (position: number) => void;
  submitBet: (side: Side) => void;
  nextRound: () => void;
  skip: () => void;
  restart: () => void;
  sendChat: (text: string) => void;
}

const MOVE_INTERVAL_MS = 40;

export function useSpectra() {
  const [state, setState] = useState<GameStateView | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [liveDial, setLiveDial] = useState(50);

  const lastMoveSent = useRef(0);
  const draggingRef = useRef(false);

  // Keep the displayed dial in sync with authoritative state, unless this
  // client is the one actively dragging it.
  useEffect(() => {
    if (state && !draggingRef.current) setLiveDial(state.dial);
  }, [state]);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onState = (s: GameStateView) => setState(s);
    const onChat = (m: ChatMessage) =>
      setChat((prev) => [...prev.slice(-199), m]);
    const onToast = (p: { message: string }) =>
      setToast({ id: Date.now() + Math.random(), message: p.message });
    const onDialLive = (p: { position: number }) => {
      if (!draggingRef.current) setLiveDial(p.position);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state", onState);
    socket.on("chat", onChat);
    socket.on("toast", onToast);
    socket.on("dial:live", onDialLive);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state", onState);
      socket.off("chat", onChat);
      socket.off("toast", onToast);
      socket.off("dial:live", onDialLive);
    };
  }, []);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const actions = useMemo<SpectraActions>(() => {
    const emitMove = (position: number) => {
      const now = Date.now();
      if (now - lastMoveSent.current >= MOVE_INTERVAL_MS) {
        lastMoveSent.current = now;
        socket.emit("dial:move", { position });
      }
    };

    return {
      createRoom: (name) =>
        new Promise((resolve) => {
          socket.emit("room:create", { name }, (res) => {
            resolve(res.ok ? { ok: true } : { ok: false, error: res.error });
          });
        }),
      joinRoom: (name, code) =>
        new Promise((resolve) => {
          socket.emit(
            "room:join",
            { name, code },
            (res: { ok: true; data: JoinResult } | { ok: false; error: string }) => {
              resolve(res.ok ? { ok: true } : { ok: false, error: res.error });
            },
          );
        }),
      leaveRoom: () => {
        socket.disconnect();
        setState(null);
        setChat([]);
        setTimeout(() => socket.connect(), 60);
      },
      switchTeam: (team) => socket.emit("team:switch", { team }),
      updateSettings: (patch) => socket.emit("settings:update", patch),
      addPair: (left, right) => socket.emit("pair:add", { left, right }),
      removePair: (id) => socket.emit("pair:remove", { id }),
      startGame: () => socket.emit("game:start"),
      submitClue: (clue) => socket.emit("clue:submit", { clue }),
      moveDial: (position) => {
        draggingRef.current = true;
        setLiveDial(position);
        emitMove(position);
      },
      lockGuess: (position) => {
        draggingRef.current = false;
        socket.emit("guess:lock", { position });
      },
      submitBet: (side) => socket.emit("bet:submit", { side }),
      nextRound: () => socket.emit("round:next"),
      skip: () => socket.emit("host:skip"),
      restart: () => socket.emit("game:restart"),
      sendChat: (text) => socket.emit("chat:send", { text }),
    };
  }, []);

  // Stop "dragging" shortly after the last move so authoritative updates resume.
  const endDrag = () => {
    draggingRef.current = false;
  };

  return { state, connected, chat, toast, liveDial, actions, endDrag };
}
