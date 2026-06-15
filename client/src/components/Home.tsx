import { useState } from "react";
import { MAX_NAME_LENGTH } from "@spectra/shared";
import type { SpectraActions } from "../useSpectra.js";
import { Lambda, SpectrumBar, SpectrumText } from "./Spectral.js";
import { Panel } from "./Panel.js";

const NAME_KEY = "spectra:name";

export function Home({
  actions,
  connected,
}: {
  actions: SpectraActions;
  connected: boolean;
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remember = (value: string) => {
    setName(value);
    localStorage.setItem(NAME_KEY, value.trim());
  };

  const guardName = (): boolean => {
    if (!name.trim()) {
      setError("Pick a name first.");
      return false;
    }
    return true;
  };

  const create = async () => {
    if (!guardName() || busy) return;
    setBusy(true);
    setError(null);
    const res = await actions.createRoom(name.trim());
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    setBusy(false);
  };

  const join = async () => {
    if (!guardName() || busy) return;
    if (!code.trim()) {
      setError("Enter a room code to join.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await actions.joinRoom(name.trim(), code.trim().toUpperCase());
    if (!res.ok) setError(res.error ?? "Could not join.");
    setBusy(false);
  };

  return (
    <div className="home">
      <div className="home__hero">
        <Lambda height={13} className="home__lambda" />
        <h1 className="home__title">
          <SpectrumText text="SPECTRA" />
        </h1>
        <p className="home__tag">tune into the same wavelength · a team game of clues</p>
        <SpectrumBar />
      </div>

      <Panel title="enter" className="home__panel">
        <label className="field">
          <span className="field__label">your name</span>
          <input
            className="field__input"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="who are you?"
            onChange={(e) => remember(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </label>

        <button className="btn btn--big" onClick={create} disabled={busy}>
          create room
        </button>

        <div className="home__divider">
          <span>── or join one ──</span>
        </div>

        <div className="home__join">
          <input
            className="field__input field__input--code"
            value={code}
            maxLength={6}
            placeholder="CODE"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
          <button className="btn" onClick={join} disabled={busy}>
            join
          </button>
        </div>

        {error && <p className="home__error">! {error}</p>}
      </Panel>

      <p className={`home__status ${connected ? "is-on" : "is-off"}`}>
        {connected ? "● connected to the spectrum" : "○ connecting…"}
      </p>
    </div>
  );
}
