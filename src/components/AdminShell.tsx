import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { shop } from '../../app/data/fixture.ts';
import { useShopConnection } from '../state/shop-context.ts';

const appNav = [
  { to: '/', label: 'Overview', end: true, icon: IconOverview },
  { to: '/events', label: 'Events', end: false, icon: IconEvents },
  { to: '/personas', label: 'Personas', end: false, icon: IconPersonas },
  { to: '/artifacts', label: 'Insights', end: false, icon: IconArtifacts },
  { to: '/runs', label: 'Agent runs', end: false, icon: IconRuns },
  { to: '/settings', label: 'Settings', end: false, icon: IconSettings },
];

const shopNav = [
  { label: 'Home', icon: IconHome },
  { label: 'Orders', icon: IconOrders },
  { label: 'Products', icon: IconProducts },
  { label: 'Customers', icon: IconCustomers },
];

export function AdminShell() {
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const location = useLocation();
  const { connected } = useShopConnection();
  const open = menuPath === location.pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuPath(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const showConnectionBanner = !connected && location.pathname !== '/settings';

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar__left">
          <button
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="app-nav"
            onClick={() => setMenuPath(open ? null : location.pathname)}
          >
            <IconMenu />
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div className="topbar__titles">
            <span className="topbar__product">Syndicate</span>
            <span className="topbar__context">Embedded app</span>
          </div>
        </div>
        <div className="topbar__right">
          <span className="pill">Fixture data</span>
          <span className="staff">
            <span className="staff__avatar" aria-hidden="true">
              S
            </span>
            Staff
          </span>
        </div>
      </header>
      <div className="shell__body">
        {open ? (
          <button type="button" className="nav-backdrop" aria-label="Close menu" onClick={() => setMenuPath(null)} />
        ) : null}
        <aside id="app-nav" className={`shell__nav${open ? ' is-open' : ''}`}>
          <div className="shop-switch">
            <span className="shop-switch__mark" aria-hidden="true">
              HA
            </span>
            <span>
              <span className="shop-switch__name">{shop.name}</span>
              <span className="shop-switch__domain">{shop.domain}</span>
            </span>
          </div>
          <p className="nav-label">Shop</p>
          <ul className="nav-inert-list">
            {shopNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <span className="nav-inert" title="Shown for context. This prototype is the Syndicate app.">
                    <Icon />
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="nav-label">Apps</p>
          <p className="nav-app">Syndicate</p>
          <nav aria-label="Syndicate">
            <ul className="nav-list">
              {appNav.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className="nav-link" onClick={() => setMenuPath(null)}>
                      <Icon />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p className="nav-foot">Prototype · not affiliated with Shopify. Agents stop before payment.</p>
        </aside>
        <main id="main" className="shell__main">
          {showConnectionBanner ? (
            <div className="shell-banner">
              <p>No shop connected. These screens still use the Harbour Athletic fixture.</p>
              <NavLink to="/settings">Open settings</NavLink>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function IconOverview() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
    </svg>
  );
}

function IconEvents() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h2v2h4V2h2v2h2.5A1.5 1.5 0 0 1 18 5.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 16.5v-11A1.5 1.5 0 0 1 3.5 4H6V2zm10 6H4v8h12V8z"
      />
    </svg>
  );
}

function IconPersonas() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-6.5 6.2C4.2 13.7 6.8 12.5 10 12.5s5.8 1.2 6.5 3.7A8 8 0 0 1 10 18a8 8 0 0 1-6.5-1.8zM10 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8z"
      />
    </svg>
  );
}

function IconArtifacts() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M3 4h6v5H3V4zm8 0h6v8h-6V4zM3 11h6v5H3v-5zm8 5h6v2h-6v-2z" />
    </svg>
  );
}

function IconRuns() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M7 5.5v9l8-4.5-8-4.5z" />
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm0 14.5A6.5 6.5 0 1 1 16.5 10 6.5 6.5 0 0 1 10 16.5z"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.2 2.2 12 4.4a6 6 0 0 1 1.6.9l2.2-.6 1.2 2-1.6 1.6a6 6 0 0 1 0 1.9l1.6 1.6-1.2 2-2.2-.6a6 6 0 0 1-1.6.9l-.8 2.2H8.8L8 15.6a6 6 0 0 1-1.6-.9l-2.2.6-1.2-2 1.6-1.6a6 6 0 0 1 0-1.9L3 8.2l1.2-2 2.2.6A6 6 0 0 1 8 5.9l.8-2.2h2.4zM10 12.3A2.3 2.3 0 1 0 7.7 10 2.3 2.3 0 0 0 10 12.3z"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M3 9.2 10 3l7 6.2V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.2z" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M4 3h12l-1 14H5L4 3zm3 2 .4 8h5.2l.4-8H7z" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M10 2 3 6v8l7 4 7-4V6l-7-4zm0 2.2 4.8 2.7L10 9.7 5.2 6.9 10 4.2zM5 8.3l4 2.3V15l-4-2.3V8.3zm6 6.7V10.6l4-2.3v4.4L11 15z" />
    </svg>
  );
}

function IconCustomers() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 9a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 7 9zm6.5 1a2 2 0 1 0-2-2 2 2 0 0 0 2 2zM2.5 16c.4-2.2 2.4-3.5 4.5-3.5s4.1 1.3 4.5 3.5H2.5zm8.2 0c-.2-1.3-.2-2.2.4-3.1.7-.3 1.5-.4 2.4-.4 1.8 0 3.4.9 3.9 3.5h-6.7z"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M3 5h14v1.6H3V5zm0 4.2h14v1.6H3V9.2zM3 13.4h14V15H3v-1.6z" />
    </svg>
  );
}
