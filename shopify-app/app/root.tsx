import type { ReactNode } from "react";
import type { LinksFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./styles/shell.css";

export const links: LinksFunction = () => [
  { rel: "preload", href: "/fonts/manrope-latin-var.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", type: "image/png", sizes: "48x48", href: "/brand/syndicate-favicon-48.png" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "/brand/syndicate-favicon-32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "/brand/syndicate-favicon-16.png" },
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
