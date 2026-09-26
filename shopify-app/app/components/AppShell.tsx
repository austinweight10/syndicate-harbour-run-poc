import type { ReactNode } from "react";
import { NavLink } from "react-router";
import type { ShellData } from "../services/shop-context.server";

const NAV = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/events", label: "Events", end: false },
  { to: "/app/personas", label: "Personas", end: false },
  { to: "/app/artifacts", label: "Insights", end: false },
  { to: "/app/graph", label: "Graph", end: false },
  { to: "/app/runs", label: "Agent runs", end: false },
] as const;

export function AppShell({
  data,
  title,
  subtitle,
  actions,
  note,
  children,
}: {
  data: ShellData;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
}) {
  const { shop } = data;
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <picture className="brand-logo">
            <source
              media="(max-width: 720px)"
              srcSet="/brand/syndicate-symbol-cream.svg"
              width={32}
              height={32}
            />
            <img src="/brand/syndicate-lockup-cream.svg" alt="Syndicate" width={180} height={44} />
          </picture>
        </div>
        <div className="topbar-shop">
          <span className="shop-domain">{shop.domain}</span>
          <span className={shop.mode === "demo" ? "mode-badge demo" : "mode-badge live"}>
            {shop.mode === "demo" ? "Demo" : "Live"}
          </span>
          {shop.connected ? (
            <span className="pill pill-success pill-dot">Connected</span>
          ) : (
            <span className="pill">Not connected</span>
          )}
        </div>
      </header>
      <div className="body-row">
        <nav className="sidenav" aria-label="App">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="nav-spacer" />
          <div className="nav-section-label">Shop</div>
          <NavLink
            to="/app/settings"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            Settings
          </NavLink>
        </nav>
        <main className="main">
          <header className="page-header">
            <div>
              <h1>{title}</h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
            {actions}
          </header>
          {note ?? <p className="compliance-note">Enrichment is labelled · agents stop before payment.</p>}
          {data.pipeline ? (
            <div className="banner" role="status">{data.pipeline.label}</div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
