"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";
import PhaseTimer from "./PhaseTimer";
import NetworkInspector from "./NetworkInspector";
import WorkshopProvider, { useWorkshop } from "./WorkshopProvider";
import ArchitectureTab from "./tabs/ArchitectureTab";
import CrudTab from "./tabs/CrudTab";
import AuthTab from "./tabs/AuthTab";
import DeployTab from "./tabs/DeployTab";
import { HOST, PHASES, STORAGE_KEYS } from "@/lib/constants";
import { CHECKLIST, CHECKLIST_TOTAL } from "@/lib/checklist";
import { goToTab, useHash, useLocalStorage } from "@/lib/hooks";

const PANELS = {
  architecture: ArchitectureTab,
  crud: CrudTab,
  auth: AuthTab,
  deploy: DeployTab,
};

const DB_PILL = {
  idle: { tone: "neutral", label: "DB not checked" },
  checking: { tone: "info", label: "Pinging…" },
  connected: { tone: "success", label: "DB connected" },
  error: { tone: "danger", label: "DB error" },
  notbuilt: { tone: "warning", label: "/api/health missing" },
  offline: { tone: "danger", label: "BFF offline" },
};

function StatusPills() {
  const { db, projects, isAuthed, user, decoded } = useWorkshop();
  const dbPill = DB_PILL[db.state];
  const username = user?.username || decoded?.payload?.username;
  const who = username ? `@${username}` : user?.name || user?.email || decoded?.payload?.name || decoded?.payload?.email;

  return (
    <div className="status-pills">
      <button type="button" className={`pill pill-${dbPill.tone}`} onClick={() => goToTab("architecture")}>
        <span className={`dot${db.state === "checking" ? " dot-pulse" : ""}`} />
        {dbPill.label}
      </button>
      <button
        type="button"
        className={`pill pill-${projects.state === "ready" ? "info" : projects.state === "notbuilt" ? "warning" : "neutral"}`}
        onClick={() => goToTab("crud")}
      >
        <Icon name="layers" size={13} />
        {projects.state === "ready" ? `${projects.items.length} projects` : "No feed yet"}
      </button>
      <button type="button" className={`pill pill-${isAuthed ? "success" : "neutral"}`} onClick={() => goToTab("auth")}>
        <Icon name={isAuthed ? "unlock" : "lock"} size={13} />
        {isAuthed ? (who ? `Signed in · ${who}` : "Signed in") : "Signed out"}
      </button>
    </div>
  );
}

function Tabs({ activeId }) {
  const { db, projects, isAuthed } = useWorkshop();
  const [checklist] = useLocalStorage(STORAGE_KEYS.checklist, {});
  const checked = CHECKLIST.flatMap((s) => s.items).filter((i) => checklist[i.id]).length;

  const done = {
    architecture: db.state === "connected",
    crud: projects.state === "ready" && projects.items.length > 0,
    auth: isAuthed,
    deploy: checked >= CHECKLIST_TOTAL,
  };

  return (
    <nav className="tabs" role="tablist" aria-label="Workshop phases">
      {PHASES.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tab${active ? " tab-active" : ""}${done[p.id] ? " tab-done" : ""}`}
            onClick={() => goToTab(p.id)}
          >
            <span className="tab-num">{done[p.id] ? <Icon name="check" size={14} strokeWidth={3} /> : p.n}</span>
            <span className="tab-text">
              <span className="tab-title">{p.title}</span>
              <span className="tab-meta">
                {p.minutes}m · <code>{p.file}</code>
              </span>
            </span>
            <kbd className="kbd tab-kbd">{p.n}</kbd>
          </button>
        );
      })}
    </nav>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useWorkshop();
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <Icon name={t.tone === "success" ? "check" : t.tone === "danger" || t.tone === "warning" ? "alert" : "info"} size={16} />
          <span>{t.message}</span>
          <button type="button" className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useTabShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      const phase = PHASES.find((p) => String(p.n) === e.key);
      if (phase) goToTab(phase.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function Shell() {
  const hash = useHash();
  const activeId = PANELS[hash] ? hash : PHASES[0].id;
  const Panel = PANELS[activeId];
  useTabShortcuts();

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="zap" size={18} strokeWidth={2.5} />
            </span>
            <span className="brand-text">
              <strong>UTP CodeFest</strong>
              <span>BFF Workshop · Spring Boot + MongoDB + JWT</span>
            </span>
          </div>
          <StatusPills />
          <PhaseTimer />
          <Link href="/about" className="host-link" title={`About ${HOST.name}`}>
            <span className="host-avatar" aria-hidden="true">
              {HOST.initials}
            </span>
            <span className="host-text">
              <small>Your host</small>
              {HOST.name}
            </span>
          </Link>
        </div>
        <div className="container">
          <Tabs activeId={activeId} />
        </div>
      </header>

      <main className="container main" role="tabpanel">
        <Panel key={activeId} />
      </main>

      <footer className="container footer">
        Built for UTP CodeFest by <Link href="/about">{HOST.name}</Link> ·{" "}
        <a href={HOST.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>{" "}
        · Next.js UI + Spring Boot BFF, MongoDB Atlas &amp; JWT · Press <kbd className="kbd">1</kbd>–
        <kbd className="kbd">4</kbd> to switch phases
      </footer>

      <NetworkInspector />
      <Toasts />
    </div>
  );
}

export default function Workshop() {
  return (
    <WorkshopProvider>
      <Shell />
    </WorkshopProvider>
  );
}
