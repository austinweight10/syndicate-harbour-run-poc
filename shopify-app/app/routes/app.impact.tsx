import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Icon, type IconName } from "../components/Icon";
import { ProvenanceChips } from "../components/Provenance";
import { Stub } from "../components/Stub";
import { loadImpactBoard, type ImpactTile, type RunView } from "../services/impact/board.server";
import { LOW_N, MIN_DAYS } from "../services/impact/metrics";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Impact · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  return { board: await loadImpactBoard(shopId) };
}

const money = (value: number, digits = 0) =>
  value.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: digits, minimumFractionDigits: digits });
const signedPct = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(Math.round(value * 100))}%`;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
const duration = (ms: number | null) => {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
};

export default function Impact() {
  const { board } = useLoaderData<typeof loader>();
  const [open, setOpen] = useState<string | null>(null);
  const { summary, tiles } = board;

  return (
    <Stub
      title="Impact"
      subtitle="What you deployed to the storefront from Insights and Occasions, and what happened next."
    >
      {tiles.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="trend" size={26} />
          </div>
          <h2>Nothing deployed yet</h2>
          <p className="muted">
            When you deploy an insight or an occasion&rsquo;s marketing pack to the storefront, it appears here with
            the sales and shopper-journey change since it went live.
          </p>
          <div className="run-actions">
            <Link className="button" to="/app/artifacts">
              Open Insights
            </Link>
            <Link className="button button-quiet" to="/app/events">
              Occasions
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="kpi-grid impact-kpis stagger" aria-label="Impact summary">
            <Stat icon="zap" label="Live on the storefront" value={String(summary.live)} />
            <Stat
              icon="trend"
              accent="green"
              label={`Sales vs store trend · ${summary.measuredTiles} measured`}
              value={summary.measuredTiles ? `${summary.incrementalRevenue >= 0 ? "+" : "−"}${money(Math.abs(summary.incrementalRevenue))}` : "—"}
            />
            <Stat icon="users" accent="violet" label="Shopper journeys improved" value={String(summary.journeysImproved)} />
            <Stat icon="clock" accent="amber" label="Still measuring" value={String(summary.measuring)} />
          </section>

          <div className="event-grid impact-grid stagger" style={{ marginTop: 20 }}>
            {tiles.map((tile) => (
              <ImpactCard
                key={tile.id}
                tile={tile}
                open={open === tile.id}
                onToggle={() => setOpen((current) => (current === tile.id ? null : tile.id))}
              />
            ))}
          </div>
          <p className="muted impact-footnote">
            Sales compare up to 10 days either side of each deployment with the rest of the store over the same days.
            That shows correlation, not proof of cause. Fewer than {LOW_N} orders on either side is an early signal.
          </p>
        </>
      )}
    </Stub>
  );
}

function Stat({ icon, label, value, accent }: { icon: IconName; label: string; value: string; accent?: "green" | "violet" | "amber" }) {
  return (
    <div className={accent ? `kpi accent-${accent}` : "kpi"}>
      <span className="kpi-top">
        <span className="kpi-icon">
          <Icon name={icon} size={16} />
        </span>
      </span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function headline(tile: ImpactTile): { value: string; label: string; tone: "up" | "down" | "flat" | "pending" } {
  const c = tile.commercial;
  if (c.status === "no_targets") return { value: "—", label: "No products linked", tone: "pending" };
  if (c.status === "measuring") return { value: `${c.daysLive}/${MIN_DAYS}`, label: "days measured", tone: "pending" };
  if (c.uplift === null) return { value: "—", label: "No sales before deploy", tone: "pending" };
  const tone = c.uplift > 0.02 ? "up" : c.uplift < -0.02 ? "down" : "flat";
  return { value: signedPct(c.uplift), label: c.status === "early" ? "sales vs store · early signal" : "sales vs store", tone };
}

const JOURNEY_PILL: Record<ImpactTile["journey"]["status"], { label: string; className: string }> = {
  improved: { label: "Journey improved", className: "pill pill-success pill-dot" },
  unchanged: { label: "Journey unchanged", className: "pill" },
  worse: { label: "Journey worse", className: "pill pill-danger pill-dot" },
  awaiting_after: { label: "Awaiting a shopper run", className: "pill pill-warn" },
  no_runs: { label: "No shopper runs", className: "pill" },
};

function ImpactCard({ tile, open, onToggle }: { tile: ImpactTile; open: boolean; onToggle: () => void }) {
  const top = headline(tile);
  const journey = JOURNEY_PILL[tile.journey.status];
  const panelId = `impact-${tile.id.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <article className={`card impact-tile${open ? " is-open" : ""}${tile.undone ? " is-undone" : ""}`}>
      <div className="card-body">
        <div className="event-card-top">
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">
              <Icon name={tile.kind === "insight" ? "bulb" : "flag"} size={13} /> {tile.eyebrow}
            </p>
            <h2>{tile.title}</h2>
          </div>
          <div className={`impact-headline tone-${top.tone}`}>
            <span className="impact-headline-value">{top.value}</span>
            <span className="impact-headline-label">{top.label}</span>
          </div>
        </div>
        <div className="meta-row">
          <span className="meta-item">
            <Icon name="clock" size={13} /> Deployed {shortDate(tile.deployedAt)}
          </span>
          <span className="meta-item">
            <Icon name="layers" size={13} /> {tile.changes.length} {tile.changes.length === 1 ? "change" : "changes"}
          </span>
          <span className="meta-item">
            <Icon name="bag" size={13} /> {tile.targets.length} {tile.targets.length === 1 ? "product" : "products"}
          </span>
        </div>
        <div className="event-card-foot">
          <span className="chip-row">
            {tile.undone ? <span className="pill">Undone</span> : <span className="pill pill-navy">Live</span>}
            <span className={journey.className}>{journey.label}</span>
            <ProvenanceChips kinds={tile.provenance} />
          </span>
          <button type="button" className="button button-quiet button-small" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            {open ? "Hide impact" : "Show impact"}
            <Icon name="chevronRight" size={14} className="impact-chevron" />
          </button>
        </div>

        {open ? (
          <div id={panelId} className="impact-detail">
            <CommercialSection tile={tile} />
            <JourneySection tile={tile} />
            <ChangesSection tile={tile} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CommercialSection({ tile }: { tile: ImpactTile }) {
  const c = tile.commercial;
  const storeTrend = c.baselineBefore > 0 ? c.baselineAfter / c.baselineBefore - 1 : null;
  const rows: { label: string; before: string; after: string }[] = [
    { label: "Orders", before: String(c.before.orders), after: String(c.after.orders) },
    { label: "Units", before: String(c.before.units), after: String(c.after.units) },
    { label: "Revenue", before: money(c.before.revenue), after: money(c.after.revenue) },
    { label: "Avg. order", before: c.before.orders ? money(c.before.aov, 2) : "—", after: c.after.orders ? money(c.after.aov, 2) : "—" },
  ];
  return (
    <section className="impact-section" aria-label="Commercial impact">
      <h3>
        <Icon name="trend" size={15} /> Commercial impact
        {c.windowDays > 0 ? <span className="impact-window">{c.windowDays} days either side</span> : null}
      </h3>
      {c.status === "no_targets" ? (
        <p className="muted">No products are linked to this change yet, so there are no sales to compare.</p>
      ) : (
        <>
          {c.status === "measuring" ? (
            <div className="callout callout-info">
              <Icon name="clock" size={15} />
              <span>
                Measuring — {c.daysLive} of {MIN_DAYS} days since deployment. Figures firm up after a week.
              </span>
            </div>
          ) : c.status === "early" ? (
            <div className="callout callout-warn">
              <Icon name="alert" size={15} />
              <span>Early signal — fewer than {LOW_N} orders on one side of the deployment.</span>
            </div>
          ) : null}
          <div className="impact-commercial">
            <table className="impact-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Metric</span>
                  </th>
                  <th scope="col">Before</th>
                  <th scope="col">After</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.before}</td>
                    <td>{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="impact-uplift">
              <span className="impact-uplift-value">{c.uplift === null ? "—" : signedPct(c.uplift)}</span>
              <span className="muted">sales change vs the rest of the store</span>
              {c.incrementalRevenue !== null ? (
                <span className="impact-uplift-sub">
                  {c.incrementalRevenue >= 0 ? "+" : "−"}
                  {money(Math.abs(c.incrementalRevenue))} above the store trend
                </span>
              ) : null}
              {storeTrend !== null ? (
                <span className="impact-uplift-sub muted">Rest of store moved {signedPct(storeTrend)} over the same days</span>
              ) : null}
            </div>
          </div>
          <Sparkline series={c.series} windowDays={Math.max(c.windowDays, 1)} />
          {tile.targets.length > 0 ? (
            <p className="muted impact-targets">Products measured: {tile.targets.join(", ")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function Sparkline({ series, windowDays }: { series: { day: string; revenue: number }[]; windowDays: number }) {
  const max = Math.max(1, ...series.map((point) => point.revenue));
  const width = 100 / series.length;
  return (
    <figure className="impact-spark">
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Daily revenue of these products, before and after deployment">
        {series.map((point, index) => {
          const height = (point.revenue / max) * 28;
          return (
            <rect
              key={point.day}
              x={index * width + width * 0.15}
              y={32 - height}
              width={width * 0.7}
              height={Math.max(height, point.revenue > 0 ? 0.8 : 0)}
              className={index < windowDays ? "bar-before" : "bar-after"}
            >
              <title>
                {shortDate(point.day)}: {money(point.revenue)}
              </title>
            </rect>
          );
        })}
        <line x1={windowDays * width} x2={windowDays * width} y1={0} y2={32} className="deploy-line" />
      </svg>
      <figcaption className="muted">
        <span>Before</span>
        <span>Deployed</span>
        <span>After</span>
      </figcaption>
    </figure>
  );
}

function JourneySection({ tile }: { tile: ImpactTile }) {
  const j = tile.journey;
  return (
    <section className="impact-section" aria-label="Shopper journeys">
      <h3>
        <Icon name="users" size={15} /> Shopper journeys
      </h3>
      {!j.fromRun && tile.kind === "insight" ? (
        <p className="muted">
          This insight came from orders and weather, not a shopper run. Below is the shopper&rsquo;s path either side of
          the change.
        </p>
      ) : null}
      {j.friction ? (
        <p className={j.friction.after === false && j.friction.before ? "impact-friction resolved" : "impact-friction"}>
          <Icon name={j.friction.after === false && j.friction.before ? "check" : "alert"} size={14} />
          {j.friction.after === false && j.friction.before
            ? `Resolved: “${j.friction.title}” no longer shows up.`
            : j.friction.after
              ? `Still present: “${j.friction.title}”.`
              : `“${j.friction.title}” — waiting for a shopper run after the change.`}
        </p>
      ) : null}
      {j.status === "no_runs" ? (
        <p className="muted">No shopper runs yet. Run agents from Shopper runs to compare journeys.</p>
      ) : (
        <div className="impact-runs">
          <RunCard label="Before" run={j.before} compareTo={null} />
          <RunCard label="After" run={j.after} compareTo={j.before} />
        </div>
      )}
    </section>
  );
}

function RunCard({ label, run, compareTo }: { label: string; run: RunView | null; compareTo: RunView | null }) {
  if (!run) {
    return (
      <div className="impact-run is-empty">
        <p className="eyebrow">{label}</p>
        <p className="muted">No shopper run {label === "After" ? "since the change" : "before the change"} yet.</p>
      </div>
    );
  }
  const resolved = compareTo?.frictions && run.frictions ? compareTo.frictions.filter((title) => !run.frictions!.includes(title)) : [];
  return (
    <div className="impact-run">
      <div className="split">
        <p className="eyebrow">
          {label} · {shortDate(run.startedAt)}
        </p>
        {run.mock ? <span className="prov prov-mock">Demo replay</span> : null}
      </div>
      <dl className="impact-run-stats">
        <div>
          <dt>Checkout</dt>
          <dd>{run.reachedCheckout ? "Reached" : "Not reached"}</dd>
        </div>
        <div>
          <dt>Time to checkout</dt>
          <dd>{duration(run.durationMs)}</dd>
        </div>
        <div>
          <dt>Steps passed</dt>
          <dd>
            {run.stepsOk}/{run.stepsTotal}
          </dd>
        </div>
        <div>
          <dt>Frictions</dt>
          <dd>{run.frictions ? run.frictions.length : "—"}</dd>
        </div>
      </dl>
      {run.frictions && run.frictions.length > 0 ? (
        <ul className="impact-frictions">
          {run.frictions.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      ) : null}
      {resolved.length > 0 ? (
        <ul className="impact-frictions resolved">
          {resolved.map((title) => (
            <li key={title}>
              <Icon name="check" size={12} /> {title}
            </li>
          ))}
        </ul>
      ) : null}
      <Link to={`/app/runs/${run.id}`} className="text-link">
        Open run <Icon name="arrowRight" size={14} />
      </Link>
    </div>
  );
}

function ChangesSection({ tile }: { tile: ImpactTile }) {
  return (
    <section className="impact-section" aria-label="What changed">
      <h3>
        <Icon name="layers" size={15} /> What changed
      </h3>
      <ul className="impact-changes">
        {tile.changes.map((change) => (
          <li key={change.label}>
            <strong>{change.label}</strong>
            <span>{change.detail}</span>
          </li>
        ))}
      </ul>
      {tile.rationale ? <p className="muted">{tile.rationale}</p> : null}
      <Link to={tile.href} className="text-link">
        {tile.kind === "insight" ? "Open Insights" : "Open occasion"} <Icon name="arrowRight" size={14} />
      </Link>
    </section>
  );
}
