import React from "react";

export type SidebarTab =
  | "loadedVideo"
  | "videoParameters"
  | "videoEffects"
  | "metadata"
  | "performance"
  | "saving";

const menuItems: Array<{ id: SidebarTab; label: string }> = [
  { id: "loadedVideo", label: "Загруженное видео" },
  { id: "videoParameters", label: "Параметры видео" },
  { id: "videoEffects", label: "Видеоэффекты" },
  { id: "metadata", label: "Метаданные" },
  { id: "performance", label: "Производительность" },
  { id: "saving", label: "Сохранение" }
];

interface SidebarProps {
  title: string;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export function Sidebar({ title, activeTab, onTabChange }: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="logo-row">
        <div className="logo-pill" />
        <span className="menu-title">{title}</span>
      </div>
      <nav className="menu-list">
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`menu-item ${item.id === activeTab ? "active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
