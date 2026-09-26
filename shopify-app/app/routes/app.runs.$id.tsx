import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { RunPoller } from "../components/RunPoller";
import { AgentNotices, RunAgentsControls, RunToast, StopBeforePay } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadRuns } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Agent run · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [runs, gate] = await Promise.all([loadRuns(shopId), loadAgentGate(shopId)]);
  return { run: runs.find((row) => row.id === params.id) ?? null, gate };
}

export default function RunDetail() {
  const { run, gate } = useLoaderData<typeof loader>();
  if (!run) {
    return (
      <Stub title="Agent run" subtitle="That run is not on this shop.">
        <p>
          <Link to="/app/runs">Back to Agent runs</Link>
        </p>
      </Stub>
    );
  }
  const live = run.status === "queued" || run.status === "running";
  return (
    <Stub
      title={run.personaName}
      subtitle={`${run.pathId} · ${run.status}`}
      actions={
        <RunAgentsControls gate={gate} personaIds={[run.personaId]} label="Run as this persona" />
      }
    >
      <RunToast />
      <AgentNotices gate={gate} />
      <StopBeforePay />
      <RunPoller live={live} />
      <section className="card">
        <div className="card-body">
          <div className="split">
            <h2>{run.status}</h2>
            {run.replay ? <span className="prov prov-mock">Mock</span> : null}
          </div>
          <p>
            {run.outcome ? run.outcome.replaceAll("_", " ") : "In progress"} · {run.progressPct}%
            {run.headed ? " · headed Chromium" : " · headless Chromium"}
          </p>
          <progress className="progress" value={run.progressPct} max={100} />
          <p className="muted">
            <code>{run.id}</code>
            {run.storefrontUrl ? ` · ${run.storefrontUrl}` : ""}
          </p>
          {run.browser ? (
            <p className="muted">
              Playwright Chromium pid {run.browser.pid ?? "unknown"} · <code>{run.browser.executablePath}</code>
            </p>
          ) : null}
          {run.errorMessage ? <p>{run.errorMessage}</p> : null}
          {run.steps.length > 0 ? (
            <ol className="timeline">
              {run.steps.map((step) => (
                <li key={`${step.id}-${step.at ?? ""}`}>
                  {step.ok ? "Done" : "Missed"} · {step.id}
                  {step.note ? ` — ${step.note}` : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Waiting for the first storefront step.</p>
          )}
          <p>
            <Link to="/app/runs">All runs</Link>
            {" · "}
            <Link to="/app/artifacts">Insights</Link>
          </p>
        </div>
      </section>
    </Stub>
  );
}
