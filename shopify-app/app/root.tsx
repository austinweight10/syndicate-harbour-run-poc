import type { ReactNode } from "react";
import type { LinksFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./styles/shell.css";

export const links: LinksFunction = () => [
  { rel: "icon", href: "/brand/syndicate-app-icon-dark.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/brand/syndicate-app-icon-dark-32.png", type: "image/png", sizes: "32x32" },
  { rel: "icon", href: "/brand/syndicate-app-icon-dark-16.png", type: "image/png", sizes: "16x16" },
  { rel: "apple-touch-icon", href: "/brand/syndicate-app-icon-dark-256.png" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#252522" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
