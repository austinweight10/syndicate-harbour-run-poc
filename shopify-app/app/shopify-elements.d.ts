import type { HTMLAttributes, AnchorHTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": HTMLAttributes<HTMLElement>;
      "s-link": AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    }
  }
}

export {};
