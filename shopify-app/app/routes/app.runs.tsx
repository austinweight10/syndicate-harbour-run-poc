import type { ActionFunctionArgs } from "react-router";
import { Outlet, redirect, useOutletContext } from "react-router";
import { enqueueAgentRuns } from "../services/agents/enqueue";
import { currentShopId } from "../services/shop-context.server";
import type { ShellData } from "../services/shop-context.server";

export async function action({ request }: ActionFunctionArgs) {
  const shopId = await currentShopId(request);
  const form = await request.formData();
  const personaIds = form.getAll("personaIds").map(String).filter(Boolean);
  const result = await enqueueAgentRuns({
    shopId,
    personaIds,
    forceHeadedDemo: form.get("forceHeadedDemo") === "true",
  });
  const params = new URLSearchParams();
  if (result.block === "url") params.set("banner", "b06");
  else if (result.block === "paused") params.set("banner", "b04");
  else if (result.block === "no-ready") params.set("toast", "t12");
  else if (result.toast === "t02") params.set("toast", "t02");
  else {
    params.set("toast", "t01");
    params.set("persona", result.created[0]?.personaName ?? "your persona");
  }
  const id = result.created[0]?.id;
  return redirect(id ? `/app/runs/${id}?${params}` : `/app/runs?${params}`);
}

export default function RunsLayout() {
  const context = useOutletContext<ShellData>();
  return <Outlet context={context} />;
}
