import React from "react";

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps): JSX.Element {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
