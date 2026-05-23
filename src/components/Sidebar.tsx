import React from "react";

const menuItems = [
  "Загруженное видео",
  "Параметры видео",
  "Видеоэффекты",
  "Метаданные",
  "Производительность",
  "Сохранение"
];

interface SidebarProps {
  title: string;
}

export function Sidebar({ title }: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="logo-row">
        <div className="logo-pill" />
        <span className="menu-title">{title}</span>
      </div>
      <nav className="menu-list">
        {menuItems.map((item, index) => (
          <button type="button" key={item} className={`menu-item ${index === 1 ? "active" : ""}`}>
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}
