import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the client runs on :5173 and proxies Socket.IO traffic to the
// game server on :3001, so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  // @spectra/shared is consumed as TypeScript source from the workspace.
  optimizeDeps: { exclude: ["@spectra/shared"] },
});
