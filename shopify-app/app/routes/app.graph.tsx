import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { EnrichmentLegendModal } from "../components/EnrichmentLegendModal";
import { GraphCanvas } from "../components/GraphCanvas";
import { Icon } from "../components/Icon";
import { Stub } from "../components/Stub";
import { emptyGraphView } from "../services/graph/graph-types";
import { loadGraphView } from "../services/graph/view.server";
import { currentShopId } from "../services/shop-context.server";
import prisma from "../db.server";

export const meta: MetaFunction = () => [{ title: "Evidence · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    return await loadGraphView(prisma, await currentShopId(request));
  } catch (error) {
    console.error(error);
    return emptyGraphView({ error: "score_failed" });
  }
}

export default function GraphPage() {
  const graph = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const openLabels = () => setLabelsOpen(true);

  return (
    <Stub
      title="Evidence"
      subtitle={subtitleFor(graph)}
      wide
      actions={
        <button type="button" className="button button-quiet" onClick={openLabels}>
          <Icon name="info" size={15} /> What labels mean
        </button>
      }
    >
      {graph.error ? (
        <div className="callout callout-warn" role="alert">
          <Icon name="alert" size={18} />
          <span>Scoring failed — this evidence map may be out of date.</span>
          <button type="button" className="button button-small" onClick={() => revalidator.revalidate()}>
            Retry
          </button>
        </div>
      ) : null}

      {graph.emptyReason === "pipeline_incomplete" ? (
        <section className="card graph-building" aria-busy="true">
          <div className="graph-skeleton">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
          <p className="graph-building-note">
            <span className="spinner" aria-hidden="true" /> Building the evidence map — it appears once occasions are
            scored.
          </p>
        </section>
      ) : null}

      {graph.emptyReason === "no_edges_after_pipeline" ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="graph" size={26} />
          </div>
          <h2>No evidence links yet</h2>
          <p className="muted">
            Once scoring finishes, this page shows how orders, products, weather, and the race calendar connect to
            each occasion.
          </p>
          <div className="run-actions">
            <Link className="button" to="/app">
              Back to Overview
            </Link>
            <Link className="button button-quiet" to="/app/settings">
              Settings
            </Link>
          </div>
        </section>
      ) : null}

      {graph.edges.length > 0 ? <GraphCanvas graph={graph} onOpenLabels={openLabels} /> : null}

      <EnrichmentLegendModal open={labelsOpen} onClose={() => setLabelsOpen(false)} />
    </Stub>
  );
}

function subtitleFor(graph: {
  error: string | null;
  emptyReason?: string;
  capped: boolean;
  edges: unknown[];
}): string {
  if (graph.error) return "Scoring failed";
  if (graph.emptyReason === "pipeline_incomplete") return "The evidence map builds after occasions are scored.";
  if (graph.emptyReason === "no_edges_after_pipeline" || graph.edges.length === 0) {
    return "No evidence links yet";
  }
  return "How orders, products, areas, weather and the race calendar add up to each occasion.";
}
