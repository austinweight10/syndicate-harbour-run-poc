import { Outlet, useOutletContext } from "react-router";
import type { ShellData } from "../services/shop-context.server";

export default function PersonasLayout() {
  const context = useOutletContext<ShellData>();
  return <Outlet context={context} />;
}
