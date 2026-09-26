import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Avatar, isReady, personaStatusLabel } from "../components/Avatar";
import { BrandGlyph, BrandPattern, DARK_TONES } from "../components/Brand";
import { Icon, type IconName } from "../components/Icon";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { ConfidenceBar, ConfidenceRing, ProvenanceChips } from "../components/Provenance";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadOverview, loadRuns } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Overview · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [board, gate, runs] = await Promise.all([loadOverview(shopId), loadAgentGate(shopId), loadRuns(shopId)]);
  return { board, gate, runCount: runs.length };
}

export default function Overview() {
  const { board: data, gate, runCount } = useLoaderData<typeof loader>();
  const readyCount = data.personas.filter((persona) => isReady(persona.status)).length;
  const subtitle = data.empty
    ? "Find shopping occasions in your orders, then watch shoppers try your storefront."
    : "What's driving demand in your shop right now — from the last 60 days of orders and the race calendar.";

  const steps: { to: string; title: string; detail: string; done: boolean }[] = [
    {
      to: "/app/events",
      title: "Score occasions",
      detail: data.kpis.events ? `${data.kpis.events} found in your orders` : "Waiting for orders",
      done: data.kpis.events > 0,
    },
    {
      to: "/app/personas",
      title: "Pick a shopper",
      detail: readyCount ? `${readyCount} ready to browse` : "No shopper ready yet",
      done: readyCount > 0,
    },
    {
      to: "/app/runs",
      title: "Watch them browse",
      detail: runCount ? `${runCount} run${runCount === 1 ? "" : "s"} · no payment` : "Stops before payment",
      done: runCount > 0,
    },
    {
      to: "/app/artifacts",
      title: "Act on insights",
      detail:
        data.kpis.insights + data.kpis.frictions
          ? `${data.kpis.insights} insights · ${data.kpis.frictions} blockers`
          : "Appear after scoring",
      done: data.kpis.insights + data.kpis.frictions > 0,
    },
  ];
  const current = steps.findIndex((step) => !step.done);

  return (
    <Stub title="Overview" subtitle={subtitle} actions={<RunAgentsControls gate={gate} />}>
      <AgentNotices gate={gate} />

      <ol className="journey" aria-label="How Syndicate works">
        {steps.map((step, index) => {
          const state = step.done ? "is-done" : index === current ? "is-current" : "";
          return (
            <li key={step.to}>
              <Link to={step.to} className={`journey-step ${state}`}>
                <span className="journey-num">{step.done ? <Icon name="check" size={15} /> : index + 1}</span>
                <span className="journey-text">
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {data.empty || !data.hero ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="sparkles" size={26} />
          </div>
          <h2>No occasions yet</h2>
          <p className="muted">
            Once orders are scored, this page shows what is driving demand — race weekends, weather, and the products
            that move with them.
          </p>
          <p className="muted">
            On a demo shop that stays empty, finish store setup (or ask whoever deployed the app to run scoring), then
            reload.
          </p>
          <div className="run-actions">
            <Link className="button" to="/app/settings">
              Open Settings
            </Link>
            <Link className="button button-quiet" to="/app/events">
              Occasions
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="hero" aria-label="Top occasion">
            <div className="hero-pattern">
              <BrandPattern tones={DARK_TONES} scale={0.42} />
            </div>
            <div className="hero-inner">
              <div>
                <p className="eyebrow">
                  <Icon name="sparkles" size={13} /> Top occasion right now
                </p>
                <h2 className="hero-title">
                  <Link to={`/app/events/${data.hero.id}`}>{data.hero.name}</Link>
                </h2>
                <p className="hero-blurb">{data.hero.blurb}</p>
                <div className="meta-row">
                  {data.hero.windowLabel ? (
                    <span className="meta-item">
                      <Icon name="clock" size={14} /> {data.hero.windowLabel}
                    </span>
                  ) : null}
                  {data.hero.city ? (
                    <span className="meta-item">
                      <Icon name="pin" size={14} /> {data.hero.city}
                    </span>
                  ) : null}
                  <span className="meta-item">
                    <Icon name="bag" size={14} /> {data.hero.nOrders} orders in window
                  </span>
                </div>
                <div className="hero-actions">
                  <Link to={`/app/events/${data.hero.id}`} className="button button-light">
                    Open occasion <Icon name="arrowRight" size={15} />
                  </Link>
                  <Link to="/app/graph" className="button button-glass">
                    <Icon name="graph" size={15} /> See the evidence
                  </Link>
                </div>
              </div>
              <div className="hero-side">
                <ConfidenceRing value={data.hero.confidence} size={128} stroke={11} inverse />
                <span className="hero-side-label">Confidence</span>
                <ProvenanceChips kinds={data.hero.provenance} />
              </div>
            </div>
          </section>

          <section className="kpi-grid stagger" aria-label="Shop totals" style={{ marginTop: 20 }}>
            <Kpi to="/app/events" icon="flag" label="Occasions" value={data.kpis.events} />
            <Kpi to="/app/artifacts" icon="bulb" label="Insights" value={data.kpis.insights} accent="green" />
            <Kpi to="/app/artifacts" icon="alert" label="Blockers" value={data.kpis.frictions} accent="red" />
            <Kpi to="/app/personas" icon="users" label="Shoppers" value={data.kpis.personas} accent="violet" />
            <Kpi to="/app/graph" icon="bag" label="Orders analysed" value={data.kpis.orders} accent="amber" />
          </section>

          <div className="overview-grid">
            <section className="card" aria-labelledby="more-occasions">
              <div className="card-head">
                <h2 id="more-occasions">Also on the radar</h2>
                <Link to="/app/events" className="text-link">
                  All occasions <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              {data.secondary.length > 0 ? (
                <ol className="occasion-list">
                  {data.secondary.map((event, index) => (
                    <li key={event.id} className="occasion-row">
                      <span className="rank">{index + 2}</span>
                      <span style={{ minWidth: 0 }}>
                        <Link to={`/app/events/${event.id}`} className="occasion-name stretched">
                          {event.name}
                        </Link>
                        <span className="occasion-sub">
                          {event.lowN ? <span className="tag tag-warn">Early signal</span> : event.windowLabel}
                          <ProvenanceChips kinds={event.provenance} />
                        </span>
                      </span>
                      <ConfidenceBar value={event.confidence} label="" />
                      <Icon name="chevronRight" size={16} className="chevron" />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted" style={{ padding: "8px 20px 18px" }}>
                  Only one occasion scored so far.
                </p>
              )}
            </section>

            <div className="stack">
              <section className="card" aria-labelledby="shoppers-head">
                <div className="card-head">
                  <h2 id="shoppers-head">Shoppers</h2>
                  <Link to="/app/personas" className="text-link">
                    All <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
                <ul className="shopper-list">
                  {data.personas.map((persona) => (
                    <li key={persona.id} className={isReady(persona.status) ? "shopper-row" : "shopper-row is-stub"}>
                      <Avatar initials={persona.initials} seed={persona.name} draft={!isReady(persona.status)} />
                      <span className="shopper-meta">
                        <Link to={`/app/personas/${persona.id}`} className="stretched">
                          <strong>{persona.name}</strong>
                        </Link>
                        <span className="shopper-goal">{persona.goals || "Goals from the order cohort"}</span>
                      </span>
                      <span className={isReady(persona.status) ? "pill pill-success pill-dot" : "pill"}>
                        {isReady(persona.status) ? "Ready" : personaStatusLabel(persona.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <Link to="/app/graph" className="card card-link teaser">
                <svg className="teaser-art" viewBox="0 0 120 84" aria-hidden="true">
                  <line x1="18" y1="20" x2="60" y2="42" />
                  <line x1="18" y1="64" x2="60" y2="42" />
                  <line x1="60" y1="42" x2="102" y2="24" />
                  <line x1="60" y1="42" x2="98" y2="66" />
                  <line x1="18" y1="20" x2="18" y2="64" />
                  <circle cx="18" cy="20" r="7" fill="#008060" />
                  <circle cx="18" cy="64" r="6" fill="#c4a574" />
                  <circle cx="102" cy="24" r="6" fill="#a11d2a" />
                  <circle cx="98" cy="66" r="5.5" fill="#3b82c4" />
                  <circle cx="60" cy="42" r="14" fill="#252522" />
                  <g transform="translate(60 42)">
                    <BrandGlyph scale={0.085} fill="#252522" seam="#f5f1e8" />
                  </g>
                </svg>
                <span>
                  <p className="eyebrow">Evidence</p>
                  <h2>See why it scored</h2>
                  <p>Orders, race calendar, weather and products — linked and labelled.</p>
                  <span className="text-link">
                    Explore the graph <Icon name="arrowRight" size={14} />
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </Stub>
  );
}

function Kpi({
  to,
  icon,
  label,
  value,
  accent,
}: {
  to: string;
  icon: IconName;
  label: string;
  value: number;
  accent?: "green" | "red" | "amber" | "violet";
}) {
  return (
    <Link to={to} className={accent ? `kpi accent-${accent}` : "kpi"}>
      <span className="kpi-top">
        <span className="kpi-icon">
          <Icon name={icon} size={16} />
        </span>
        <Icon name="arrowRight" size={15} className="kpi-arrow" />
      </span>
      <span className="kpi-value">{value.toLocaleString("en-GB")}</span>
      <span className="kpi-label">{label}</span>
    </Link>
  );
}
