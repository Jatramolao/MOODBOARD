"use client";

import {
  CaretDown,
  FolderSimple,
  GridFour,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import type { WorkspaceRuntime } from "./BoardWorkspace";

const navItems = [
  { label: "Tablero general", icon: GridFour, active: true },
  { label: "Referencias", icon: FolderSimple },
  { label: "Equipo", icon: UsersThree },
];

export function Sidebar({ runtime }: { runtime: WorkspaceRuntime }) {
  const projectName =
    runtime.kind === "supabase" ? runtime.projectName : "Campaña Otoño 2026";
  const profile =
    runtime.kind === "supabase"
      ? runtime.user
      : {
          name: "Marina Soler",
          initials: "MS",
          role: "Dirección creativa",
        };

  return (
    <aside className="sidebar" aria-label="Navegación del proyecto">
      <div className="wordmark" aria-label="Moodboard" translate="no">
        MOODBOARD
      </div>

      <button className="project-switcher" type="button">
        <span>{projectName}</span>
        <CaretDown size={15} weight="bold" aria-hidden="true" />
      </button>

      <nav className="project-nav">
        {navItems.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            className="nav-item"
            data-active={active || undefined}
            type="button"
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} weight={active ? "duotone" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
        <button className="nav-item nav-item-muted" type="button">
          <Plus size={18} />
          <span>Nuevo tablero</span>
        </button>
      </nav>

      <button className="profile-button" type="button">
        <span className="profile-avatar">{profile.initials}</span>
        <span>
          <strong>{profile.name}</strong>
          <small>{profile.role}</small>
        </span>
      </button>
    </aside>
  );
}
