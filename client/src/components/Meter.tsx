import { useRef, useState } from "react";
import { SCORE_BANDS, type SpectrumCard } from "@spectra/shared";
import { spectralColor } from "./Spectral.js";

// The spectrum is drawn as a row of CELLS block glyphs — entirely text.
const CELLS = 41;
const cellDial = (i: number): number => ((i + 0.5) / CELLS) * 100;
const CELL_COLORS = Array.from({ length: CELLS }, (_, i) => spectralColor((i + 0.5) / CELLS));

function tierAt(distance: number): number {
  for (const band of SCORE_BANDS) if (distance <= band.halfWidth) return band.score;
  return 0;
}

export interface MeterProps {
  position: number;
  card: SpectrumCard | null;
  target: number | null;
  showTarget: boolean;
  interactive: boolean;
  onChange?: (pos: number) => void;
  onCommitEnd?: () => void;
}

export function Meter({
  position,
  card,
  target,
  showTarget,
  interactive,
  onChange,
  onCommitEnd,
}: MeterProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const posFromX = (clientX: number): number => {
    const el = barRef.current;
    if (!el) return position;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  };

  const down = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange?.(posFromX(e.clientX));
  };
  const move = (e: React.PointerEvent) => {
    if (interactive && dragging) onChange?.(posFromX(e.clientX));
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    onCommitEnd?.();
  };

  const showBand = showTarget && target != null;

  return (
    <div
      className={`meter ${interactive ? "meter--live" : ""}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="meter__track">
        <span
          className="meter__marker"
          style={{ left: `${position}%`, transition: dragging ? "none" : "left 0.15s ease-out" }}
          aria-hidden="true"
        >
          ▼
        </span>
        <div className="meter__bar" ref={barRef} aria-hidden="true">
          {CELL_COLORS.map((color, i) => (
            <span
              key={i}
              style={{ color, animationDelay: `${(i / CELLS) * 2}s` }}
            >
              █
            </span>
          ))}
        </div>
        <div className="meter__targetrow" aria-hidden="true">
          {Array.from({ length: CELLS }, (_, i) => {
            const tier = showBand ? tierAt(Math.abs(cellDial(i) - target!)) : 0;
            return (
              <span key={i} className={tier ? `tier tier--${tier}` : ""}>
                {tier ? String(tier) : " "}
              </span>
            );
          })}
        </div>
      </div>
      <div className="meter__labels">
        <span className="meter__label meter__label--l">◄ {card?.left ?? ""}</span>
        <span className="meter__label meter__label--r">{card?.right ?? ""} ►</span>
      </div>
    </div>
  );
}
