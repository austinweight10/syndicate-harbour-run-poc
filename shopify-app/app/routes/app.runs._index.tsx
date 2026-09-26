import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { RunPoller } from "../components/RunPoller";
import { AgentNotices, RunAgentsControls, RunToast, StopBeforePay } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadRuns } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Agent runs · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [runs, gate] = await Promise.all([loadRuns(shopId), loadAgentGate(shopId)]);
  return { runs, gate };
}

export default function RunsIndex() {
  const { runs, gate } = useLoaderData<typeof loader>();
  const live = runs.some((run) => run.status === "queued" || run.status === "running");
  return (
    <Stub
      title="Agent runs"
      subtitle="Playwright shoppers on your storefront. One at a time. They stop before payment."
      actions={<RunAgentsControls gate={gate} />}
    >
      <RunToast />
      <AgentNotices gate={gate} />
      <StopBeforePay />
      <RunPoller live={live} />
      {runs.length === 0 ? (
        <section className="card">
          <div className="card-body">
            <h2>No runs yet</h2>
            <p className="muted">
              Run agents walks Race Kits, the youth tee, and checkout, then stops. Nothing is written
              here until that job creates an AgentRun.
            </p>
          </div>
        </section>
      ) : (
        runs.map((run) => (
          <article key={run.id} className="card">
            <div className="card-body">
              <div className="split">
                <h2>
                  <Link to={`/app/runs/${run.id}`}>{run.personaName}</Link>
                </h2>
                {run.replay ? <span className="prov prov-mock">Mock</span> : <span className="pill">{run.status}</span>}
              </div>
              <p>
                {run.pathId} · {run.status}
                {run.outcome ? ` · ${run.outcome.replaceAll("_", " ")}` : ""}
              </p>
              <progress className="progress" value={run.progressPct} max={100} />
              <p className="muted">
                <code>{run.id}</code>
                {run.headed ? " · headed" : " · headless"}
              </p>
              {run.errorMessage ? <p>{run.errorMessage}</p> : null}
            </div>
          </article>
        ))
      )}
    </Stub>
  );
}
