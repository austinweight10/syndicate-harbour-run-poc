import type { ReactNode } from "react";
import { useOutletContext } from "react-router";
import { AppShell, type Crumb } from "./AppShell";
import type { ShellData } from "../services/shop-context.server";

export function useShell(): ShellData {
  return useOutletContext<ShellData>();
}

export function Stub({
  title,
  subtitle,
  actions,
  note,
  back,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  note?: ReactNode;
  back?: Crumb;
  wide?: boolean;
  children?: ReactNode;
}) {
  const data = useShell();
  return (
    <AppShell data={data} title={title} subtitle={subtitle} actions={actions} note={note} back={back} wide={wide}>
      {children}
    </AppShell>
  );
}
