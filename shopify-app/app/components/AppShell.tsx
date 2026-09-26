import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import type { ShellData } from "../services/shop-context.server";
import { BrandSymbol } from "./Brand";
import { Icon, type IconName } from "./Icon";

const NAV: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: "/app", label: "Overview", icon: "home", end: true },
  { to: "/app/events", label: "Occasions", icon: "flag", end: false },
  { to: "/app/personas", label: "Shoppers", icon: "users", end: false },
  { to: "/app/runs", label: "Shopper runs", icon: "play", end: false },
  { to: "/app/artifacts", label: "Insights", icon: "bulb", end: false },
  { to: "/app/graph", label: "Evidence", icon: "graph", end: false },
];

export type Crumb = { to: string; label: string };

export function AppShell({
  data,
  title,
  subtitle,
  actions,
  note,
  back,
  wide,
  children,
}: {
  data: ShellData;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  note?: ReactNode;
  back?: Crumb;
  wide?: boolean;
  children?: ReactNode;
}) {
  const { shop } = data;
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/app" className="topbar-brand" aria-label="Syndicate overview">
          <BrandSymbol size={26} seam="#252522" className="brand-symbol" />
          <img src="/brand/syndicate-wordmark-white.svg" alt="Syndicate" className="brand-wordmark" width={98} height={22} />
          <span className="brand-tag">Occasion intelligence</span>
        </Link>
        <div className="topbar-shop">
          <span className="shop-domain" title={shop.domain}>
            <Icon name="store" size={13} />
            {shop.domain}
          </span>
          <span className={shop.mode === "demo" ? "mode-badge demo" : "mode-badge live"}>
            {shop.mode === "demo" ? "Demo" : "Live"}
          </span>
          {shop.connected ? (
            <span className="pill pill-success pill-dot">Connected</span>
          ) : (
            <span className="pill pill-warn">Not connected</span>
          )}
        </div>
      </header>
      <div className="body-row">
        <nav className="sidenav" aria-label="App">
          <div className="nav-section-label">Workspace</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              prefetch="intent"
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className="nav-spacer" />
          <div className="nav-card">
            <Icon name="shield" size={16} />
            <span>Evidence is labelled. Shoppers always stop before payment.</span>
          </div>
          <NavLink
            to="/app/settings"
            prefetch="intent"
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Icon name="sliders" size={17} />
            <span>Settings</span>
          </NavLink>
        </nav>
        <main className={wide ? "main main-wide" : "main"}>
          <header className="page-header">
            <div className="page-heading">
              {back ? (
                <Link to={back.to} className="back-link">
                  <Icon name="arrowLeft" size={14} />
                  {back.label}
                </Link>
              ) : null}
              <h1>{title}</h1>
              {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
              {note}
            </div>
            {actions ? <div className="page-actions">{actions}</div> : null}
          </header>
          {data.pipeline ? (
            <div className="callout callout-info callout-live" role="status">
              <span className="spinner" aria-hidden="true" />
              <span>{data.pipeline.label}</span>
            </div>
          ) : null}
          <div className="page-body">{children}</div>
        </main>
      </div>
    </div>
  );
}
