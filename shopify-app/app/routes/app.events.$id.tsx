import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Avatar, isReady, personaStatusLabel } from "../components/Avatar";
import { ContentPackPanel } from "../components/ContentPack";
import { Icon } from "../components/Icon";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { RunPoller } from "../components/RunPoller";
import { Stub } from "../components/Stub";
import { ConfidenceRing, ProvenanceChips } from "../components/Provenance";
import { loadAgentGate } from "../services/agents/gate";
import { ensureMarketingWrites } from "../services/actions/write-scope.server";
import { loadEventDetail } from "../services/board.server";
import { applyPack, undoPack } from "../services/content-pack/apply.server";
import { loadPackView } from "../services/content-pack/board.server";
import { generatePack, kickPackDraft, redraftPack } from "../services/content-pack/generate.server";
import { TRENDING_CONFIDENCE } from "../services/content-pack/types";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Occasion · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const eventId = params.id ?? "";
  const [detail, gate] = await Promise.all([loadEventDetail(shopId, eventId), loadAgentGate(shopId)]);
  const trending = Boolean(detail && detail.confidence >= TRENDING_CONFIDENCE);
  const drafting = detail && trending ? await kickPackDraft(shopId, detail.id, detail.confidence) : false;
  const pack = detail ? await loadPackView(shopId, detail.id) : null;
  return { detail, gate, pack, trending, drafting, shopId };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const shopId = await currentShopId(request);
  const eventId = params.id ?? "";
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const packId = String(form.get("packId") ?? "");

  if (intent === "generate_pack" || intent === "redraft_pack") {
    if (intent === "redraft_pack") await redraftPack(shopId, eventId);
    else await generatePack(shopId, eventId);
    return { ok: true as const, message: "Marketing pack drafted." };
  }
  if (intent === "apply_pack" || intent === "undo_pack") {
    await ensureMarketingWrites(request, shopId);
    return intent === "apply_pack" ? applyPack(shopId, packId) : undoPack(shopId, packId);
  }
  return { ok: false as const, message: "Unknown action." };
}

type TabId = "signals" | "catalogue" | "personas";

export default function EventDetailPage() {
  const { detail, gate, pack, trending, drafting, shopId } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<TabId>("signals");
  const linkedReady = detail?.personas.filter((persona) => persona.status === "ready").map((persona) => persona.id) ?? [];

  if (!detail) {
    return (
      <Stub title="Occasion" subtitle="That occasion is not on this shop." back={{ to: "/app/events", label: "Occasions" }}>
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="flag" size={26} />
          </div>
          <h2>Not found</h2>
          <div className="run-actions">
            <Link className="button button-quiet" to="/app/events">
              Back to occasions
            </Link>
          </div>
        </section>
      </Stub>
    );
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "signals", label: "Why it scored" },
    { id: "catalogue", label: "Products", count: detail.topSkus.length },
    { id: "personas", label: "Shoppers", count: detail.personas.length },
  ];

  const signals = [
    { name: "Timing lift", hint: "Sales vs usual timing", value: detail.Lt },
    { name: "Area overlap", hint: "Shared postcodes with the venue", value: detail.G },
    { name: "Product fit", hint: "Affinity to kit and gear", value: detail.A },
    { name: "Year-ago echo", hint: "Same window last year", value: detail.Y },
    { name: "Extra lift", hint: "Unexplained residual", value: detail.R },
  ];
  const scale = Math.max(1, ...signals.map((signal) => signal.value));
  const strongest = [...signals].sort((a, b) => b.value - a.value)[0];

  return (
    <Stub
      title={detail.name}
      subtitle={detail.blurb}
      back={{ to: "/app/events", label: "Occasions" }}
      actions={<RunAgentsControls gate={gate} personaIds={linkedReady} />}
    >
      <AgentNotices gate={gate} />
      <RunPoller live={Boolean(drafting && !pack)} quiet />

      <section className="card detail-hero">
        <div className="card-body">
          <ConfidenceRing value={detail.confidence} size={118} stroke={10} />
          <div style={{ minWidth: 0 }}>
            <div className="split" style={{ flexWrap: "wrap", marginBottom: 8 }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Confidence · {detail.enrichmentSource.replaceAll("_", " ")}
                {trending ? " · Trending" : ""}
              </p>
              <ProvenanceChips kinds={detail.provenance} />
            </div>
            <div className="meta-row">
              <span className="meta-item">
                <Icon name="pin" size={14} /> {detail.city ?? "No venue city"}
              </span>
              {detail.windowLabel ? (
                <span className="meta-item">
                  <Icon name="clock" size={14} /> {detail.windowLabel}
                </span>
              ) : null}
            </div>
            <div className="stat-trio">
              <div className="stat">
                <div className="stat-value">{detail.nOrders}</div>
                <div className="stat-label">Orders in window</div>
              </div>
              <div className="stat">
                <div className="stat-value">{detail.baselinePct.toFixed(1)}%</div>
                <div className="stat-label">Baseline share</div>
              </div>
              <div className="stat">
                <div className="stat-value" style={{ fontSize: 16, paddingTop: 4 }}>{strongest.name}</div>
                <div className="stat-label">Strongest signal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {detail.lowN ? (
        <div className="callout callout-warn" role="status">
          <Icon name="alert" size={18} />
          <span>
            <strong>Early signal</strong> — fewer than five orders in this window, so treat the score as directional.
          </span>
        </div>
      ) : null}

      <ContentPackPanel
        pack={pack}
        trending={trending}
        drafting={drafting && !pack}
        shopDomain={shopId}
      />

      <section className="card">
        <div className="card-body">
          <div className="tabs" role="tablist" aria-label="Occasion detail">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                className={tab === item.id ? "tab active" : "tab"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {item.count != null ? <span className="tab-count">{item.count}</span> : null}
              </button>
            ))}
          </div>

          {tab === "signals" ? (
            <div className="tab-panel" role="tabpanel" id="panel-signals" aria-labelledby="tab-signals">
              <ul className="signal-bars">
                {signals.map((signal) => (
                  <li key={signal.name} className="signal-bar">
                    <span className="signal-name">
                      {signal.name}
                      <span className="signal-hint">{signal.hint}</span>
                    </span>
                    <span className="signal-track">
                      <span
                        className="signal-fill"
                        style={{ display: "block", width: `${Math.max(2, (signal.value / scale) * 100)}%` }}
                      />
                    </span>
                    <span className="signal-value">{signal.value.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="signal-foot">
                <span>
                  Baseline share <strong>{detail.baselinePct.toFixed(1)}%</strong>
                </span>
                {detail.competing.length > 0 ? (
                  <span>
                    Competing that day:{" "}
                    {detail.competing.map((row, i) => (
                      <strong key={row.eventId ?? row.name ?? i}>
                        {i > 0 ? ", " : ""}
                        {row.name ?? row.eventId} ({row.valuePct ?? "—"}%)
                      </strong>
                    ))}
                  </span>
                ) : (
                  <span>No competing occasion on the same London day.</span>
                )}
              </div>
            </div>
          ) : null}

          {tab === "catalogue" ? (
            <div className="tab-panel" role="tabpanel" id="panel-catalogue" aria-labelledby="tab-catalogue">
              {detail.labels.length > 0 ? (
                <div className="tag-row" style={{ marginBottom: 6 }}>
                  {detail.labels.map((label) => (
                    <span key={label} className="tag">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="subhead">Products moving in the window</p>
              {detail.topSkus.length > 0 ? (
                <ul className="item-list">
                  {detail.topSkus.map((sku) => (
                    <li key={sku.title}>
                      <span className="item-icon">
                        <Icon name="bag" size={15} />
                      </span>
                      <span className="item-main">{sku.title}</span>
                      {sku.sku ? <code className="muted">{sku.sku}</code> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No products linked in this window.</p>
              )}
            </div>
          ) : null}

          {tab === "personas" ? (
            <div className="tab-panel" role="tabpanel" id="panel-personas" aria-labelledby="tab-personas">
              {detail.personas.length > 0 ? (
                <ul className="shopper-list" style={{ padding: 0 }}>
                  {detail.personas.map((persona) => (
                    <li key={persona.id} className={isReady(persona.status) ? "shopper-row" : "shopper-row is-stub"}>
                      <Avatar initials={initials(persona.name)} seed={persona.name} draft={!isReady(persona.status)} />
                      <span className="shopper-meta">
                        <Link to={`/app/personas/${persona.id}`} className="stretched">
                          <strong>{persona.name}</strong>
                        </Link>
                      </span>
                      <span className={isReady(persona.status) ? "pill pill-success pill-dot" : "pill"}>
                        {personaStatusLabel(persona.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No shopper is pinned to this occasion yet.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <Link to="/app/graph" className="text-link">
        <Icon name="graph" size={15} /> See this occasion in the evidence graph <Icon name="arrowRight" size={14} />
      </Link>
    </Stub>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
