import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Icon } from "../components/Icon";
import { RunPoller } from "../components/RunPoller";
import { AgentNotices, RunAgentsControls, RunToast, StopBeforePay } from "../components/RunAgents";
import { RunProgress, StatusOrb, StatusPill, isLive, runStatusLabel } from "../components/RunStatus";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadRuns } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Shopper runs · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [runs, gate] = await Promise.all([loadRuns(shopId), loadAgentGate(shopId)]);
  return { runs, gate };
}

export default function RunsIndex() {
  const { runs, gate } = useLoaderData<typeof loader>();
  const live = runs.some((run) => isLive(run.status));
  return (
    <Stub
      title="Shopper runs"
      subtitle="Watch personas browse your storefront — one at a time, always stopping before payment."
      actions={<RunAgentsControls gate={gate} />}
    >
      <RunToast />
      <AgentNotices gate={gate} />
      <StopBeforePay />
      <RunPoller live={live} />
      {runs.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="play" size={24} />
          </div>
          <h2>No runs yet</h2>
          <p className="muted">
            When you watch a shopper browse, each visit shows up here with live progress. They walk key product paths
            and stop before paying.
          </p>
          <p className="muted">Use the green button above once a storefront URL and a ready shopper are set.</p>
        </section>
      ) : (
        <div className="stack stagger">
          {runs.map((run) => (
            <article key={run.id} className="card card-link run-card">
              <div className="card-body">
                <StatusOrb status={run.status} />
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <Link to={`/app/runs/${run.id}`} className="stretched">
                      {run.personaName}
                    </Link>
                  </h2>
                  <p className="meta-row">
                    <span>
                      {runStatusLabel(run.status)}
                      {run.outcome ? ` · ${run.outcome.replaceAll("_", " ")}` : ""}
                    </span>
                    <span>{run.headed ? "Visible browser" : "Background browser"}</span>
                    {run.steps.length ? <span>{run.steps.length} steps</span> : null}
                  </p>
                  <RunProgress status={run.status} value={run.progressPct} />
                  {run.errorMessage ? <p className="muted" style={{ margin: 0, color: "var(--kit-red)" }}>{run.errorMessage}</p> : null}
                </div>
                <div className="chip-row" style={{ alignItems: "center" }}>
                  {run.replay ? <span className="prov prov-mock">Demo replay</span> : null}
                  <StatusPill status={run.status} />
                  <span className="muted" style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 650 }}>
                    {run.progressPct ?? 0}%
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Stub>
  );
}
