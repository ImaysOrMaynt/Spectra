import type { ReactNode } from "react";

/** A terminal-style framed panel with an optional bracketed title. */
export function Panel({
  title,
  children,
  className = "",
  right,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <span className="panel__corner panel__corner--tl" aria-hidden="true">
        ┌
      </span>
      <span className="panel__corner panel__corner--tr" aria-hidden="true">
        ┐
      </span>
      <span className="panel__corner panel__corner--bl" aria-hidden="true">
        └
      </span>
      <span className="panel__corner panel__corner--br" aria-hidden="true">
        ┘
      </span>
      {(title || right) && (
        <header className="panel__head">
          {title && <span className="panel__title">{title}</span>}
          {right && <span className="panel__right">{right}</span>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}
