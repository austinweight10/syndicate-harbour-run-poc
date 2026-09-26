import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Stub } from "../components/Stub";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { ConfidenceBar, ProvenanceChips } from "../components/Provenance";
import { loadAgentGate } from "../services/agents/gate";
import { loadOverview } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Overview · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [board, gate] = await Promise.all([loadOverview(shopId), loadAgentGate(shopId)]);
  return { board, gate };
}

export default function Overview() {
  const { board: data, gate } = useLoaderData<typeof loader>();
  const subtitle = data.empty
    ? "No scored occasions yet. Run the demo pipeline, then refresh."
    : "London race weekend · orders and calendar from SQLite · last 60 days";

  return (
    <Stub
      title="This weekend"
      subtitle={subtitle}
      actions={<RunAgentsControls gate={gate} />}
    >
      <AgentNotices gate={gate} />
      <section className="kpi-strip" aria-label="Shop totals">
        <Kpi label="Events" value={data.kpis.events} />
        <Kpi label="Insights" value={data.kpis.insights} />
        <Kpi label="Frictions" value={data.kpis.frictions} />
        <Kpi label="Personas" value={data.kpis.personas} />
        <Kpi label="Orders" value={data.kpis.orders} />
      </section>

      {data.empty || !data.hero ? (
        <section className="card">
          <div className="card-body">
            <h2>Graph is empty</h2>
            <p className="muted">
              Seeded orders are in SQLite, but EventCandidates are written by the scoring job. From
              shopify-app run <code>npm run pipeline:demo</code>, then reload this page.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="card hero-card">
            <div className="card-body">
              <p className="eyebrow">Lead occasion</p>
              <div className="hero-row">
                <div>
                  <h2 className="display-title">
                    <Link to={`/app/events/${data.hero.id}`}>{data.hero.name}</Link>
                  </h2>
                  <p>{data.hero.blurb}</p>
                  <p className="muted">
                    {data.hero.windowLabel}
                    {data.hero.city ? ` · ${data.hero.city}` : ""} · {data.hero.nOrders} orders
                  </p>
                </div>
                <ProvenanceChips kinds={data.hero.provenance} />
              </div>
              <ConfidenceBar value={data.hero.confidence} />
            </div>
          </section>

          {data.secondary.length > 0 ? (
            <section className="stack">
              {data.secondary.map((event) => (
                <article key={event.id} className="card">
                  <div className="card-body tight">
                    <div className="split">
                      <h2>
                        <Link to={`/app/events/${event.id}`}>{event.name}</Link>
                      </h2>
                      <ProvenanceChips kinds={event.provenance} />
                    </div>
                    <ConfidenceBar value={event.confidence} />
                    <p className="muted">{event.lowN ? "Early signal." : event.windowLabel}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          <section className="card">
            <div className="card-body">
              <h2>Personas on this shop</h2>
              <ul className="persona-list">
                {data.personas.map((persona) => (
                  <li key={persona.id} className={persona.status === "stub" ? "is-stub" : ""}>
                    <span className="avatar" aria-hidden="true">{persona.initials}</span>
                    <span>
                      <strong>{persona.name}</strong>
                      <span className="muted"> · {persona.status} · {persona.goals}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                <Link to="/app/artifacts">Open Insights</Link>
                {" · "}
                <Link to="/app/events">All events</Link>
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card-body tight">
              <p className="eyebrow">Graph</p>
              <h2>
                <Link to="/app/graph">Occasion graph · Race-day evidence path</Link>
              </h2>
              <p className="muted">Orders, the London race proxy, weather, and the scored occasion.</p>
            </div>
          </section>
        </>
      )}
    </Stub>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="kpi">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
