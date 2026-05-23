import React from "react";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatter = (next) => next.toFixed(2)
}: SliderControlProps): JSX.Element {
  return (
    <section className="card slider-card">
      <div className="card-header-row">
        <h3>{label}</h3>
        <span className="value-chip">{formatter(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      />
      <div className="minmax-row">
        <span>{formatter(min)}</span>
        <span>{formatter(max)}</span>
      </div>
    </section>
  );
}
