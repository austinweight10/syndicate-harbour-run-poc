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

export const meta: MetaFunction = () => [{ title: "Shopper run · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [runs, gate] = await Promise.all([loadRuns(shopId), loadAgentGate(shopId)]);
  return { run: runs.find((row) => row.id === params.id) ?? null, gate };
}

export default function RunDetail() {
  const { run, gate } = useLoaderData<typeof loader>();
  if (!run) {
    return (
      <Stub title="Shopper run" subtitle="That run is not on this shop." back={{ to: "/app/runs", label: "Shopper runs" }}>
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="play" size={24} />
          </div>
          <h2>Not found</h2>
          <div className="run-actions">
            <Link className="button button-quiet" to="/app/runs">
              Back to Shopper runs
            </Link>
          </div>
        </section>
      </Stub>
    );
  }
  const live = isLive(run.status);
  return (
    <Stub
      title={run.personaName}
      subtitle={`${runStatusLabel(run.status)}${run.outcome ? ` · ${run.outcome.replaceAll("_", " ")}` : ""}`}
      back={{ to: "/app/runs", label: "Shopper runs" }}
      actions={<RunAgentsControls gate={gate} personaIds={[run.personaId]} label="Browse as this shopper" />}
    >
      <RunToast />
      <AgentNotices gate={gate} />
      <StopBeforePay />
      <RunPoller live={live} />

      <section className="card run-hero">
        <div className="card-body">
          <StatusOrb status={run.status} />
          <div style={{ minWidth: 0 }}>
            <div className="split">
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22 }}>
                {run.progressPct ?? 0}% complete
              </h2>
              <span className="chip-row">
                {run.replay ? <span className="prov prov-mock">Demo replay</span> : null}
                <StatusPill status={run.status} />
              </span>
            </div>
            <RunProgress status={run.status} value={run.progressPct} />
            <p className="meta-row">
              <span className="meta-item">
                <Icon name="eye" size={13} /> {run.headed ? "Visible browser" : "Background browser"}
              </span>
              {run.storefrontUrl ? (
                <span className="meta-item">
                  <Icon name="store" size={13} /> {run.storefrontUrl}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {run.errorMessage ? (
        <div className="callout callout-warn" role="alert">
          <Icon name="alert" size={18} />
          <span>{run.errorMessage}</span>
        </div>
      ) : null}

      <section className="card">
        <div className="card-head">
          <h2>Journey</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {run.steps.filter((step) => step.ok).length} of {run.steps.length} steps completed
          </span>
        </div>
        <div className="card-body">
          {run.steps.length > 0 ? (
            <ol className="timeline">
              {run.steps.map((step, index) => (
                <li
                  key={`${step.id}-${step.at ?? ""}`}
                  className={step.ok ? undefined : "is-miss"}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="timeline-dot">
                    <Icon name={step.ok ? "check" : "x"} size={14} />
                  </span>
                  <span>
                    <strong>{humanStep(step.id)}</strong>
                    <span>{step.note ? step.note : step.ok ? "Done" : "Missed"}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ display: "flex", gap: 10, alignItems: "center", margin: 0 }}>
              {live ? <span className="spinner" aria-hidden="true" /> : null}
              Waiting for the first storefront step.
            </p>
          )}
        </div>
        <div className="card-foot">
          <Link to="/app/artifacts" className="text-link">
            See what this run found <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </section>
    </Stub>
  );
}

function humanStep(id: string) {
  return id.replaceAll("_", " ").replaceAll("-", " ");
}
