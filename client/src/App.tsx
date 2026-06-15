import { useSpectra } from "./useSpectra.js";
import { Home } from "./components/Home.js";
import { Lobby } from "./components/Lobby.js";
import { Game } from "./components/Game.js";
import { SpectrumText } from "./components/Spectral.js";

export function App() {
  const { state, connected, chat, toast, liveDial, actions, endDrag } = useSpectra();

  const me = state?.players.find((p) => p.id === state.you.id);
  const context = state
    ? `room ${state.code} · ${me?.name ?? "?"}${state.phase !== "lobby" ? ` · ${state.phase}` : ""}`
    : "main menu";

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true" />
      <div className="app__scan" aria-hidden="true" />

      <div className="app__inner">
        <header className="statusbar">
          <span className="statusbar__brand">
            <SpectrumText text="SPECTRA" light={72} />
          </span>
          <span className="statusbar__lam">λ</span>
          <span className="statusbar__sep">│</span>
          <span className="statusbar__ctx">{context}</span>
          <span className="statusbar__spacer" />
          <span className={`statusbar__conn ${connected ? "is-on" : "is-off"}`}>
            {connected ? "● online" : "○ offline"}
          </span>
        </header>

        <main className="app__main">
          {!state ? (
            <Home actions={actions} connected={connected} />
          ) : state.phase === "lobby" ? (
            <Lobby state={state} actions={actions} chat={chat} />
          ) : (
            <Game
              state={state}
              actions={actions}
              liveDial={liveDial}
              endDrag={endDrag}
              chat={chat}
            />
          )}
        </main>
      </div>

      {toast && <div className="toast">{toast.message}</div>}
      {!connected && state && <div className="reconnect">○ reconnecting to the spectrum…</div>}
    </div>
  );
}
