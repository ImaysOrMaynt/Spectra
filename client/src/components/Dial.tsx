import { useRef, useState } from "react";
import { SCORE_BANDS, type SpectrumCard } from "@spectra/shared";
import { spectralColor } from "./Spectral.js";

// The dial is drawn onto a character grid using box-drawing line glyphs —
// a real ASCII gauge, not a graphic. Colour is applied per character.
const COLS = 33;
const ROWS = 9;
const CX = (COLS - 1) / 2;
const CY = ROWS - 1;
const RX = (COLS - 1) / 2;
const RY = ROWS - 1;
const D2R = Math.PI / 180;

const arcChar = (t: number): string =>
  t <= 22.5 || t >= 157.5 ? "│" : t <= 67.5 ? "╲" : t <= 112.5 ? "─" : "╱";
const needleChar = (t: number): string =>
  t <= 22.5 || t >= 157.5 ? "─" : t <= 67.5 ? "╱" : t <= 112.5 ? "│" : "╲";

const TIER_COLOR: Record<number, string> = {
  2: "rgba(255, 224, 138, 0.5)",
  3: "rgba(255, 224, 138, 0.82)",
  4: "#ffe9a8",
};

function tierAt(distance: number): number {
  for (const band of SCORE_BANDS) if (distance <= band.halfWidth) return band.score;
  return 0;
}

interface Cell {
  ch: string;
  color: string;
  kind: "" | "arc" | "band" | "needle" | "hub";
}

const blank = (): Cell => ({ ch: " ", color: "transparent", kind: "" });

function buildGrid(
  position: number,
  target: number | null,
  showTarget: boolean,
  showNeedle: boolean,
): Cell[][] {
  const g: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, blank),
  );
  const put = (r: number, c: number, cell: Cell) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) g[r][c] = cell;
  };

  // Arc, coloured left→right across the spectrum.
  for (let t = 0; t <= 180; t += 0.4) {
    const c = Math.round(CX + RX * Math.cos(t * D2R));
    const r = Math.round(CY - RY * Math.sin(t * D2R));
    put(r, c, { ch: arcChar(t), color: spectralColor(c / (COLS - 1)), kind: "arc" });
  }

  // Recolour the arc within the hidden target's scoring zones.
  if (showTarget && target != null) {
    for (let t = 0; t <= 180; t += 0.4) {
      const tier = tierAt(Math.abs((180 - t) / 1.8 - target));
      if (!tier) continue;
      const c = Math.round(CX + RX * Math.cos(t * D2R));
      const r = Math.round(CY - RY * Math.sin(t * D2R));
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && g[r][c].kind === "arc") {
        g[r][c] = { ch: g[r][c].ch, color: TIER_COLOR[tier], kind: "band" };
      }
    }
  }

  // Needle, from the pivot out to the arc.
  if (showNeedle) {
    const tg = 180 - position * 1.8;
    const ch = needleChar(tg);
    for (let s = 0.14; s <= 1.001; s += 0.05) {
      const c = Math.round(CX + s * RX * Math.cos(tg * D2R));
      const r = Math.round(CY - s * RY * Math.sin(tg * D2R));
      put(r, c, { ch, color: "#ffffff", kind: "needle" });
    }
  }

  g[CY][CX] = { ch: "●", color: "#ffffff", kind: "hub" };
  return g;
}

export interface DialProps {
  position: number;
  card: SpectrumCard | null;
  target: number | null;
  showTarget: boolean;
  showNeedle: boolean;
  interactive: boolean;
  onChange?: (pos: number) => void;
  onCommitEnd?: () => void;
}

export function Dial({
  position,
  card,
  target,
  showTarget,
  showNeedle,
  interactive,
  onChange,
  onCommitEnd,
}: DialProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const posFromEvent = (clientX: number, clientY: number): number => {
    const el = gridRef.current;
    if (!el) return position;
    const r = el.getBoundingClientRect();
    const pivotX = r.left + (r.width * (CX + 0.5)) / COLS;
    const pivotY = r.top + (r.height * (CY + 0.5)) / ROWS;
    const dx = clientX - pivotX;
    const dy = pivotY - clientY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle = dx >= 0 ? 0 : 180;
    angle = Math.max(0, Math.min(180, angle));
    return (180 - angle) / 1.8;
  };

  const down = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange?.(posFromEvent(e.clientX, e.clientY));
  };
  const move = (e: React.PointerEvent) => {
    if (interactive && dragging) onChange?.(posFromEvent(e.clientX, e.clientY));
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    onCommitEnd?.();
  };

  const grid = buildGrid(position, target, showTarget, showNeedle);

  return (
    <div
      className={`dial ${interactive ? "dial--live" : ""}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="dial__grid" ref={gridRef} aria-hidden="true">
        {grid.map((row, r) => (
          <div className="dial__row" key={r}>
            {row.map((cell, c) => (
              <span
                key={c}
                className={`dial__cell${cell.kind ? ` dial__cell--${cell.kind}` : ""}`}
                style={{
                  color: cell.color,
                  animationDelay: cell.kind === "arc" ? `${(c / COLS) * 2}s` : undefined,
                }}
              >
                {cell.ch}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="dial__labels">
        <span className="dial__label dial__label--l">◄ {card?.left ?? ""}</span>
        <span className="dial__label dial__label--r">{card?.right ?? ""} ►</span>
      </div>
    </div>
  );
}
