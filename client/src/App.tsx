import { useSpectra } from "./useSpectra.js";
import { Home } from "./components/Home.js";
import { Lobby } from "./components/Lobby.js";
import { Game } from "./components/Game.js";

export function App() {
  const { state, connected, chat, toast, liveDial, actions, endDrag } = useSpectra();

  return (
    <div className="app">
      <div className="app__bg" aria-hidden="true" />
      <div className="app__scan" aria-hidden="true" />

      <div className="app__inner">
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
      </div>

      {toast && <div className="toast">{toast.message}</div>}

      {!connected && state && (
        <div className="reconnect">○ reconnecting to the spectrum…</div>
      )}
    </div>
  );
}
