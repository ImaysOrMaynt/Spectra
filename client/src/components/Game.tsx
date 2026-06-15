import { useEffect, useState } from "react";
import type {
  ChatMessage,
  GameStateView,
  RoundResult,
  Team,
} from "@spectra/shared";
import type { SpectraActions } from "../useSpectra.js";
import { Dial } from "./Dial.js";
import { Chat } from "./Chat.js";
import { Panel } from "./Panel.js";
import { SpectrumText } from "./Spectral.js";

const otherTeam = (t: Team): Team => (t === "A" ? "B" : "A");

function Scoreboard({ state }: { state: GameStateView }) {
  const active = state.activeTeam;
  return (
    <div className="score">
      {(["A", "B"] as Team[]).map((team) => (
        <div
          key={team}
          className={`score__team score__team--${team} ${active === team ? "is-active" : ""}`}
        >
          <span className="score__name">TEAM {team}</span>
          <span className="score__pts">{state.scores[team]}</span>
        </div>
      ))}
      <div className="score__meta">
        <span>round {state.round}</span>
        <span className="score__to">first to {state.settings.targetScore}</span>
      </div>
    </div>
  );
}

function ClueForm({ onSubmit }: { onSubmit: (clue: string) => void }) {
  const [clue, setClue] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clue.trim()) return;
    onSubmit(clue.trim());
    setClue("");
  };
  return (
    <form className="clue-form" onSubmit={submit}>
      <input
        className="field__input clue-form__input"
        autoFocus
        maxLength={60}
        placeholder="one clue for your team…"
        value={clue}
        onChange={(e) => setClue(e.target.value)}
      />
      <button className="btn btn--big" type="submit">
        send clue
      </button>
    </form>
  );
}

function ResultPanel({
  result,
  getName,
}: {
  result: RoundResult;
  getName: (id: string) => string;
}) {
  const opp = otherTeam(result.activeTeam);
  const betText =
    result.bet == null
      ? `Team ${opp} didn't bet`
      : `Team ${opp} bet ${result.bet} → ${
          result.betWon ? "correct (+1)" : result.correctSide ? "wrong" : "no side to win"
        }`;
  return (
    <div className="result">
      <div className="result__row">
        <span className="result__big" style={{ color: "var(--spec-c)" }}>
          Team {result.activeTeam} +{result.zoneScore}
        </span>
        <span className="result__detail">
          {getName(result.psychicId)} hinted “{result.clue}”
        </span>
      </div>
      <div className="result__row result__row--bet">{betText}</div>
      <div className="result__scores">
        score · A {result.scores.A} — {result.scores.B} B
      </div>
    </div>
  );
}

function Stage({
  state,
  actions,
  liveDial,
  endDrag,
  getName,
  secs,
}: {
  state: GameStateView;
  actions: SpectraActions;
  liveDial: number;
  endDrag: () => void;
  getName: (id: string) => string;
  secs: number | null;
}) {
  const { phase, you, activeTeam, psychicId } = state;
  const isActiveTeam = you.team != null && you.team === activeTeam;
  const isActiveGuesser = isActiveTeam && !you.isPsychic;
  const isOpponent = you.team != null && you.team !== activeTeam;
  const psychicName = psychicId ? getName(psychicId) : "—";

  let position = liveDial;
  if (phase === "clue") position = 50;
  else if (phase === "bet") position = state.dial;
  else if (phase === "reveal" || phase === "over") position = state.result?.guess ?? state.dial;

  const showTarget =
    you.isPsychic || phase === "reveal" || phase === "over";

  return (
    <div className="stage">
      {(phase === "guess" || phase === "bet") && state.clue && (
        <div className="stage__clue">
          <span className="stage__clue-label">clue</span>
          <SpectrumText text={state.clue} className="stage__clue-text" light={70} />
        </div>
      )}

      <Dial
        position={position}
        card={state.card}
        target={state.target}
        showTarget={showTarget}
        interactive={phase === "guess" && isActiveGuesser}
        onChange={actions.moveDial}
        onCommitEnd={endDrag}
      />

      <div className="stage__controls">
        {phase === "clue" && you.isPsychic && (
          <div className="stage__psychic">
            <p className="stage__role">
              you are the <strong className="role-psychic">psychic</strong> · only you see the
              target
            </p>
            <ClueForm onSubmit={actions.submitClue} />
          </div>
        )}
        {phase === "clue" && !you.isPsychic && (
          <p className="stage__wait">
            <span className="dots">{psychicName} is thinking of a clue</span>
          </p>
        )}

        {phase === "guess" && isActiveGuesser && (
          <button className="btn btn--big" onClick={() => actions.lockGuess(liveDial)}>
            lock guess
          </button>
        )}
        {phase === "guess" && you.isPsychic && (
          <p className="stage__wait">your team is guessing — no peeking hints!</p>
        )}
        {phase === "guess" && isOpponent && (
          <p className="stage__wait">team {activeTeam} is dialing in their guess…</p>
        )}

        {phase === "bet" && isOpponent && (
          <div className="stage__bet">
            <p className="stage__role">
              is the real target <strong>left</strong> or <strong>right</strong> of their guess?
            </p>
            <div className="bet-buttons">
              <button className="btn btn--big" onClick={() => actions.submitBet("left")}>
                ◄ left
              </button>
              <button className="btn btn--big" onClick={() => actions.submitBet("right")}>
                right ►
              </button>
            </div>
          </div>
        )}
        {phase === "bet" && !isOpponent && (
          <p className="stage__wait">team {otherTeam(activeTeam!)} is betting left or right…</p>
        )}

        {phase === "reveal" && state.result && (
          <div className="stage__reveal">
            <ResultPanel result={state.result} getName={getName} />
            <div className="stage__next">
              {you.isHost ? (
                <button className="btn" onClick={actions.nextRound}>
                  next round {secs != null ? `(${secs})` : ""}
                </button>
              ) : (
                <span className="stage__wait">
                  next round{secs != null ? ` in ${secs}…` : "…"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameOver({
  state,
  actions,
}: {
  state: GameStateView;
  actions: SpectraActions;
}) {
  const a = state.scores.A;
  const b = state.scores.B;
  const winner: Team = a >= b ? "A" : "B";
  return (
    <div className="over">
      <div className="over__banner">
        <SpectrumText text={`TEAM ${winner} WINS`} light={66} />
      </div>
      <div className="over__scores">
        <span className={winner === "A" ? "is-win" : ""}>A · {a}</span>
        <span className="over__dash">—</span>
        <span className={winner === "B" ? "is-win" : ""}>{b} · B</span>
      </div>
      {state.you.isHost ? (
        <button className="btn btn--big" onClick={actions.restart}>
          play again
        </button>
      ) : (
        <p className="stage__wait">waiting for the host to restart…</p>
      )}
    </div>
  );
}

export function Game({
  state,
  actions,
  liveDial,
  endDrag,
  chat,
}: {
  state: GameStateView;
  actions: SpectraActions;
  liveDial: number;
  endDrag: () => void;
  chat: ChatMessage[];
}) {
  const [secs, setSecs] = useState<number | null>(state.timer);
  const getName = (id: string): string =>
    state.players.find((p) => p.id === id)?.name ?? "someone";

  useEffect(() => {
    setSecs(state.timer);
  }, [state.timer, state.round, state.phase]);

  useEffect(() => {
    if (secs == null || secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => (s != null ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const canSkip =
    state.you.isHost &&
    (state.phase === "clue" || state.phase === "guess" || state.phase === "bet");

  return (
    <div className="game">
      <main className="game__stage">
        <Scoreboard state={state} />
        {state.phase === "over" ? (
          <GameOver state={state} actions={actions} />
        ) : (
          <Stage
            state={state}
            actions={actions}
            liveDial={liveDial}
            endDrag={endDrag}
            getName={getName}
            secs={secs}
          />
        )}
        {canSkip && (
          <button className="btn btn--tiny game__skip" onClick={actions.skip}>
            skip round
          </button>
        )}
      </main>

      <aside className="game__side">
        <Panel
          title="players"
          right={
            <button className="btn btn--tiny" onClick={actions.leaveRoom}>
              leave
            </button>
          }
        >
          <ul className="roster">
            {state.players.map((p) => (
              <li
                key={p.id}
                className={`roster__row roster__row--${p.team ?? "none"} ${
                  p.connected ? "" : "is-gone"
                }`}
              >
                <span className="roster__tag">{p.team ?? "·"}</span>
                <span className="roster__name">
                  {p.name}
                  {p.id === state.psychicId && <span className="roster__psychic"> ψ</span>}
                  {p.id === state.you.id && <span className="roster__you"> (you)</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Chat chat={chat} onSend={actions.sendChat} />
      </aside>
    </div>
  );
}
