import { useState } from "react";
import {
  MAX_TERM_LENGTH,
  MIN_PLAYERS_PER_TEAM,
  type ChatMessage,
  type GameStateView,
  type PlayerView,
  type Team,
} from "@spectra/shared";
import type { SpectraActions } from "../useSpectra.js";
import { Panel } from "./Panel.js";
import { Chat } from "./Chat.js";
import { SpectrumText } from "./Spectral.js";

function TeamColumn({
  team,
  players,
  youId,
  active,
  onJoin,
}: {
  team: Team;
  players: PlayerView[];
  youId: string;
  active: boolean;
  onJoin: () => void;
}) {
  return (
    <div className={`team team--${team} ${active ? "team--mine" : ""}`}>
      <div className="team__head">
        <span className="team__name">TEAM {team}</span>
        <span className="team__count">{players.length}</span>
      </div>
      <ul className="team__list">
        {players.map((p) => (
          <li key={p.id} className={`team__player ${p.connected ? "" : "is-gone"}`}>
            {p.isHost ? "♦ " : "· "}
            {p.name}
            {p.id === youId && <span className="team__you"> (you)</span>}
          </li>
        ))}
        {players.length === 0 && <li className="team__empty">— empty —</li>}
      </ul>
      {!active && (
        <button className="btn btn--small" onClick={onJoin}>
          join {team}
        </button>
      )}
    </div>
  );
}

function CustomPairs({
  state,
  actions,
  isHost,
}: {
  state: GameStateView;
  actions: SpectraActions;
  isHost: boolean;
}) {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const add = () => {
    if (!left.trim() || !right.trim()) return;
    actions.addPair(left.trim(), right.trim());
    setLeft("");
    setRight("");
  };

  return (
    <div className="pairs">
      {isHost && (
        <div className="pairs__form">
          <input
            className="field__input"
            placeholder="left end"
            maxLength={MAX_TERM_LENGTH}
            value={left}
            onChange={(e) => setLeft(e.target.value)}
          />
          <span className="pairs__arrow">⟷</span>
          <input
            className="field__input"
            placeholder="right end"
            maxLength={MAX_TERM_LENGTH}
            value={right}
            onChange={(e) => setRight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn--small" onClick={add}>
            add
          </button>
        </div>
      )}
      <ul className="pairs__list">
        {state.customPairs.length === 0 && (
          <li className="pairs__empty">no custom pairs yet</li>
        )}
        {state.customPairs.map((p) => (
          <li key={p.id} className="pairs__item">
            <span className="pairs__term pairs__term--l">{p.left}</span>
            <span className="pairs__arrow">⟷</span>
            <span className="pairs__term pairs__term--r">{p.right}</span>
            {isHost && (
              <button
                className="btn btn--tiny"
                title="remove"
                onClick={() => actions.removePair(p.id)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Lobby({
  state,
  actions,
  chat,
}: {
  state: GameStateView;
  actions: SpectraActions;
  chat: ChatMessage[];
}) {
  const [copied, setCopied] = useState(false);
  const isHost = state.you.isHost;
  const teamA = state.players.filter((p) => p.team === "A");
  const teamB = state.players.filter((p) => p.team === "B");
  const connA = teamA.filter((p) => p.connected).length;
  const connB = teamB.filter((p) => p.connected).length;
  const canStart = connA >= MIN_PLAYERS_PER_TEAM && connB >= MIN_PLAYERS_PER_TEAM;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code is on screen anyway */
    }
  };

  return (
    <div className="lobby">
      <div className="lobby__main">
      <Panel
        title="room"
        className="lobby__room"
        right={
          <button className="btn btn--tiny" onClick={actions.leaveRoom}>
            leave
          </button>
        }
      >
        <div className="lobby__code-row">
          <span className="lobby__code-label">share this code:</span>
          <button className="lobby__code" onClick={copyCode} title="copy">
            <SpectrumText text={state.code} light={68} />
          </button>
          <span className="lobby__copied">{copied ? "copied!" : ""}</span>
        </div>
      </Panel>

      <Panel title="teams" className="lobby__teams">
        <div className="teams">
          <TeamColumn
            team="A"
            players={teamA}
            youId={state.you.id}
            active={state.you.team === "A"}
            onJoin={() => actions.switchTeam("A")}
          />
          <div className="teams__vs">vs</div>
          <TeamColumn
            team="B"
            players={teamB}
            youId={state.you.id}
            active={state.you.team === "B"}
            onJoin={() => actions.switchTeam("B")}
          />
        </div>
      </Panel>

      <Panel title="settings" className="lobby__settings">
        <div className="setting">
          <span className="setting__label">play to</span>
          <div className="stepper">
            <button
              className="btn btn--tiny"
              disabled={!isHost}
              onClick={() => actions.updateSettings({ targetScore: state.settings.targetScore - 1 })}
            >
              −
            </button>
            <span className="stepper__value">{state.settings.targetScore}</span>
            <button
              className="btn btn--tiny"
              disabled={!isHost}
              onClick={() => actions.updateSettings({ targetScore: state.settings.targetScore + 1 })}
            >
              +
            </button>
          </div>
          <span className="setting__hint">points to win</span>
        </div>

        <div className="setting">
          <span className="setting__label">default deck</span>
          <button
            className={`toggle ${state.settings.useDefaultDeck ? "is-on" : ""}`}
            disabled={!isHost}
            onClick={() =>
              actions.updateSettings({ useDefaultDeck: !state.settings.useDefaultDeck })
            }
          >
            {state.settings.useDefaultDeck ? "[✓] on" : "[ ] off"}
          </button>
          <span className="setting__hint">{state.deckSize} cards in play</span>
        </div>

        <div className="setting setting--block">
          <span className="setting__label">custom spectrum pairs</span>
          <CustomPairs state={state} actions={actions} isHost={isHost} />
        </div>
      </Panel>

      <div className="lobby__start">
        {isHost ? (
          <>
            <button className="btn btn--big" disabled={!canStart} onClick={actions.startGame}>
              start game
            </button>
            {!canStart && (
              <p className="lobby__hint">
                each team needs at least {MIN_PLAYERS_PER_TEAM} players to start
              </p>
            )}
          </>
        ) : (
          <p className="lobby__hint">waiting for the host to start…</p>
        )}
      </div>
      </div>
      <aside className="lobby__aside">
        <Chat chat={chat} onSend={actions.sendChat} />
      </aside>
    </div>
  );
}
