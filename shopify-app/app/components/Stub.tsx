import type { ReactNode } from "react";
import { useOutletContext } from "react-router";
import { AppShell } from "./AppShell";
import type { ShellData } from "../services/shop-context.server";

export function useShell(): ShellData {
  return useOutletContext<ShellData>();
}

export function Stub({
  title,
  subtitle,
  actions,
  note,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
}) {
  const data = useShell();
  return (
    <AppShell data={data} title={title} subtitle={subtitle} actions={actions} note={note}>
      {children}
    </AppShell>
  );
}
