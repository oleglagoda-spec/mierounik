import React from "react";

interface RangePairControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  formatter?: (value: number) => string;
}

export function RangePairControl({
  label,
  min,
  max,
  step,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  formatter = (value) => value.toFixed(2)
}: RangePairControlProps): JSX.Element {
  const normalizedMin = Math.min(minValue, maxValue);
  const normalizedMax = Math.max(minValue, maxValue);

  return (
    <section className="card slider-card range-pair-card">
      <div className="card-header-row">
        <h3>{label}</h3>
        <span className="value-chip">
          {formatter(normalizedMin)} .. {formatter(normalizedMax)}
        </span>
      </div>

      <label className="range-row">
        <span>Min</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={(event) => onMinChange(Number.parseFloat(event.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(minValue.toFixed(3))}
          onChange={(event) => onMinChange(Number.parseFloat(event.target.value))}
        />
      </label>

      <label className="range-row">
        <span>Max</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={(event) => onMaxChange(Number.parseFloat(event.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(maxValue.toFixed(3))}
          onChange={(event) => onMaxChange(Number.parseFloat(event.target.value))}
        />
      </label>

      <div className="minmax-row">
        <span>{formatter(min)}</span>
        <span>{formatter(max)}</span>
      </div>
    </section>
  );
}
