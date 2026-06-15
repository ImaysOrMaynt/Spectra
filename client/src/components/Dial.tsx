import { useRef, useState } from "react";
import { SCORE_BANDS, type SpectrumCard } from "@spectra/shared";
import { spectralColor } from "./Spectral.js";

const VIEW_W = 440;
const VIEW_H = 250;
const CX = 220;
const CY = 218;
const R = 188;
const TRACK = 18;

const posToAngle = (pos: number): number => 180 - pos * 1.8;

function pt(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY - radius * Math.sin(a)];
}

/** A filled sector spanning a dial range, approximated by sampled points. */
function wedge(posLo: number, posHi: number, radius: number): string {
  const steps = 26;
  let d = `M ${CX} ${CY}`;
  for (let i = 0; i <= steps; i++) {
    const pos = posLo + ((posHi - posLo) * i) / steps;
    const [x, y] = pt(posToAngle(pos), radius);
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} Z`;
}

const TRACK_SEGMENTS = 72;
const segments = Array.from({ length: TRACK_SEGMENTS }, (_, i) => {
  const [x1, y1] = pt(posToAngle((i / TRACK_SEGMENTS) * 100), R);
  const [x2, y2] = pt(posToAngle(((i + 1) / TRACK_SEGMENTS) * 100), R);
  return { x1, y1, x2, y2, color: spectralColor((i + 0.5) / TRACK_SEGMENTS) };
});

// Brightness/colour of each scoring band, drawn widest-first so the bullseye
// sits on top.
const BAND_STYLES: Record<number, { fill: string; opacity: number }> = {
  2: { fill: "#ffffff", opacity: 0.16 },
  3: { fill: "#ffffff", opacity: 0.32 },
  4: { fill: "#ffe08a", opacity: 0.92 },
};

export interface DialProps {
  position: number;
  card: SpectrumCard | null;
  target: number | null;
  showTarget: boolean;
  interactive: boolean;
  onChange?: (pos: number) => void;
  onCommitEnd?: () => void;
}

export function Dial({
  position,
  card,
  target,
  showTarget,
  interactive,
  onChange,
  onCommitEnd,
}: DialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const posFromEvent = (clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return position;
    const rect = svg.getBoundingClientRect();
    const scale = rect.width / VIEW_W;
    const px = (clientX - rect.left) / scale;
    const py = (clientY - rect.top) / scale;
    const dx = px - CX;
    const dy = CY - py;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle = dx >= 0 ? 0 : 180; // below the baseline → nearest end
    angle = Math.max(0, Math.min(180, angle));
    return ((180 - angle) / 180) * 100;
  };

  const handleDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange?.(posFromEvent(e.clientX, e.clientY));
  };
  const handleMove = (e: React.PointerEvent) => {
    if (!interactive || !dragging) return;
    onChange?.(posFromEvent(e.clientX, e.clientY));
  };
  const handleUp = () => {
    if (!dragging) return;
    setDragging(false);
    onCommitEnd?.();
  };

  const needleAngle = (position - 50) * 1.8;
  const needleLen = R - TRACK / 2 - 6;
  const [tipX, tipY] = [CX, CY - needleLen];

  return (
    <div className={`dial ${interactive ? "dial--live" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="dial__svg"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
      >
        {/* Backing arc */}
        <path
          d={`M ${CX - R - TRACK} ${CY} A ${R + TRACK} ${R + TRACK} 0 0 1 ${CX + R + TRACK} ${CY}`}
          className="dial__backing"
        />

        {/* Spectral track */}
        <g strokeWidth={TRACK} strokeLinecap="round">
          {segments.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} />
          ))}
        </g>

        {/* Hidden target band */}
        {showTarget && target != null && (
          <g className="dial__bands">
            {[...SCORE_BANDS]
              .sort((a, b) => b.halfWidth - a.halfWidth)
              .map((band) => {
                const lo = Math.max(0, target - band.halfWidth);
                const hi = Math.min(100, target + band.halfWidth);
                const style = BAND_STYLES[band.score];
                return (
                  <path
                    key={band.score}
                    d={wedge(lo, hi, R + TRACK / 2)}
                    fill={style.fill}
                    opacity={style.opacity}
                  />
                );
              })}
            {/* Exact target line */}
            <line
              x1={CX}
              y1={CY}
              x2={pt(posToAngle(target), R + TRACK / 2)[0]}
              y2={pt(posToAngle(target), R + TRACK / 2)[1]}
              className="dial__target-line"
            />
          </g>
        )}

        {/* End labels */}
        {card && (
          <>
            <text x={CX - R - TRACK + 6} y={CY + 26} className="dial__label dial__label--left">
              ◄ {card.left}
            </text>
            <text x={CX + R + TRACK - 6} y={CY + 26} className="dial__label dial__label--right">
              {card.right} ►
            </text>
          </>
        )}

        {/* Needle */}
        <g
          className="dial__needle"
          style={{
            transformBox: "view-box",
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${needleAngle}deg)`,
            transition: dragging ? "none" : "transform 0.16s cubic-bezier(.2,.85,.25,1)",
          }}
        >
          <line x1={CX} y1={CY} x2={tipX} y2={tipY} className="dial__needle-line" />
          <circle cx={tipX} cy={tipY} r={interactive ? 9 : 6} className="dial__needle-tip" />
        </g>

        {/* Hub */}
        <circle cx={CX} cy={CY} r={12} className="dial__hub" />
        <circle cx={CX} cy={CY} r={4} className="dial__hub-dot" />
      </svg>
    </div>
  );
}
