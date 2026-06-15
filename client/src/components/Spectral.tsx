// Shared spectral/ASCII presentation primitives.

/** Map t in [0,1] to a colour sweeping red → violet across the spectrum. */
export function spectralColor(t: number, light = 62, sat = 90): string {
  const clamped = Math.max(0, Math.min(1, t));
  return `hsl(${clamped * 300} ${sat}% ${light}%)`;
}

/** Render text with each character tinted along the spectrum. */
export function SpectrumText({
  text,
  className = "",
  light = 64,
}: {
  text: string;
  className?: string;
  light?: number;
}) {
  const chars = [...text];
  const denom = Math.max(1, chars.length - 1);
  return (
    <span className={`spectrum-text ${className}`} role="text" aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ color: spectralColor(chars.length === 1 ? 0.5 : i / denom, light) }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** A decorative row of block glyphs that shimmer in a travelling wave. */
export function SpectrumBar({ count = 56, char = "▆" }: { count?: number; char?: string }) {
  return (
    <div className="spectrum-bar" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            color: spectralColor(i / (count - 1)),
            animationDelay: `${(i / count) * 1.8}s`,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

/** Build a symmetric block-art capital lambda, the project's emblem. */
function buildLambda(height: number): string {
  const width = height * 2;
  const center = height;
  const rows: string[] = [];
  for (let i = 0; i < height; i++) {
    const filled = new Set([center - 1 - i, center - i, center - 1 + i, center + i]);
    let line = "";
    for (let x = 0; x < width; x++) line += filled.has(x) ? "█" : " ";
    rows.push(line);
  }
  return rows.join("\n");
}

export function Lambda({ height = 12, className = "" }: { height?: number; className?: string }) {
  return (
    <pre className={`lambda ${className}`} aria-hidden="true">
      {buildLambda(height)}
    </pre>
  );
}
