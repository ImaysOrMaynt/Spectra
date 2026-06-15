import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@spectra/shared";
import { Panel } from "./Panel.js";

export function Chat({
  chat,
  onSend,
}: {
  chat: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <Panel title="chat" className="chat">
      <div className="chat__log" ref={logRef}>
        {chat.length === 0 && <p className="chat__empty">no messages yet…</p>}
        {chat.map((m) =>
          m.system ? (
            <p key={m.id} className="chat__line chat__line--system">
              » {m.text}
            </p>
          ) : (
            <p key={m.id} className="chat__line">
              <span className={`chat__name chat__name--${m.team ?? "none"}`}>{m.name}</span>
              <span className="chat__sep">:</span> {m.text}
            </p>
          ),
        )}
      </div>
      <form className="chat__form" onSubmit={submit}>
        <span className="chat__prompt">›</span>
        <input
          className="chat__input"
          value={text}
          maxLength={240}
          placeholder="say something…"
          onChange={(e) => setText(e.target.value)}
        />
      </form>
    </Panel>
  );
}
