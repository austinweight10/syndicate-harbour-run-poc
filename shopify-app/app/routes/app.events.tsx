import { Outlet, useOutletContext } from "react-router";
import type { ShellData } from "../services/shop-context.server";

export default function EventsLayout() {
  const context = useOutletContext<ShellData>();
  return <Outlet context={context} />;
}
