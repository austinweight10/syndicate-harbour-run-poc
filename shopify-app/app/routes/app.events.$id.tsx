import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { ConfidenceBar, ProvenanceChips } from "../components/Provenance";
import { loadAgentGate } from "../services/agents/gate";
import { loadEventDetail } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Event · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [detail, gate] = await Promise.all([
    loadEventDetail(shopId, params.id ?? ""),
    loadAgentGate(shopId),
  ]);
  return { detail, gate };
}

const TABS = [
  { id: "signals", label: "Signals" },
  { id: "catalogue", label: "Catalogue" },
  { id: "personas", label: "Personas" },
] as const;

export default function EventDetailPage() {
  const { detail, gate } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("signals");
  const linkedReady = detail?.personas.filter((persona) => persona.status === "ready").map((persona) => persona.id) ?? [];

  if (!detail) {
    return (
      <Stub title="Event" subtitle="That occasion is not on this shop.">
        <section className="card">
          <div className="card-body">
            <h2>Not in the graph</h2>
            <p>
              <Link to="/app/events">Back to events</Link>
            </p>
          </div>
        </section>
      </Stub>
    );
  }

  return (
    <Stub
      title={detail.name}
      subtitle={detail.blurb}
      actions={<RunAgentsControls gate={gate} personaIds={linkedReady} />}
    >
      <AgentNotices gate={gate} />
      <p>
        <Link to="/app/events">Events</Link>
      </p>
      <section className="card">
        <div className="card-body">
          <div className="split">
            <p className="eyebrow">{detail.city ?? "No venue city"} · {detail.enrichmentSource.replaceAll("_", " ")}</p>
            <ProvenanceChips kinds={detail.provenance} />
          </div>
          <ConfidenceBar value={detail.confidence} />
          <p className="muted">{detail.windowLabel}</p>
          <div className="tabs" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "tab active" : "tab"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab === "signals" ? (
            <div className="signal-grid">
              <Signal name="Temporal lift" hint="Lt" value={detail.Lt} />
              <Signal name="Geo overlap" hint="G" value={detail.G} />
              <Signal name="Affinity" hint="A" value={detail.A} />
              <Signal name="Prior year" hint="Y" value={detail.Y} />
              <Signal name="Residual" hint="R" value={detail.R} />
              <div>
                <p className="muted">Baseline share</p>
                <p>{detail.baselinePct.toFixed(1)}%</p>
              </div>
            </div>
          ) : null}
          {tab === "catalogue" ? (
            <div>
              <p>{detail.labels.join(" · ")}</p>
              {detail.competing.length > 0 ? (
                <ul>
                  {detail.competing.map((row) => (
                    <li key={row.eventId ?? row.name}>
                      {row.name ?? row.eventId} · {row.valuePct ?? "—"}% share
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No competing occasion on the same London day.</p>
              )}
              {detail.topSkus.length > 0 ? (
                <>
                  <h2>SKUs in the window</h2>
                  <ul>
                    {detail.topSkus.map((sku) => (
                      <li key={sku.title}>{sku.title}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted">No SKU edges in this window.</p>
              )}
            </div>
          ) : null}
          {tab === "personas" ? (
            detail.personas.length > 0 ? (
              <ul>
                {detail.personas.map((persona) => (
                  <li key={persona.id}>
                    {persona.name} · {persona.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No persona is pinned to this occasion yet.</p>
            )
          ) : null}
          {detail.lowN ? (
            <p className="banner warn">Early signal — fewer than five orders in this window.</p>
          ) : null}
        </div>
      </section>
    </Stub>
  );
}

function Signal({ name, hint, value }: { name: string; hint: string; value: number }) {
  return (
    <div>
      <p className="muted">
        {name} ({hint})
      </p>
      <p>{value.toFixed(2)}</p>
    </div>
  );
}
