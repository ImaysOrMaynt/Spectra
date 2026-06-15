import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@spectra/shared";

export type SpectraSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Same-origin connection: Vite proxies /socket.io to the game server in dev,
// and the server hosts the built client in production.
export const socket: SpectraSocket = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
});
