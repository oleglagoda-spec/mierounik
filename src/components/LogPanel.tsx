import React from "react";

interface LogPanelProps {
  lines: string[];
}

export function LogPanel({ lines }: LogPanelProps): JSX.Element {
  return (
    <section className="card log-card">
      <div className="card-header-row">
        <h3>Лог процесса</h3>
        <span className="value-chip">{lines.length}</span>
      </div>
      <div className="log-list">
        {lines.length === 0 ? <p className="muted">Лог пока пуст</p> : null}
        {lines.map((line, index) => (
          <p key={`${index}-${line}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}
