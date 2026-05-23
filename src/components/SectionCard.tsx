import React, { type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps): JSX.Element {
  return (
    <section className="card section-card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
