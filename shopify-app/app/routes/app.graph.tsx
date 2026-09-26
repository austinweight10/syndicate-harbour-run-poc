import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { EnrichmentLegendModal } from "../components/EnrichmentLegendModal";
import { GraphCanvas } from "../components/GraphCanvas";
import { Stub } from "../components/Stub";
import { emptyGraphView } from "../services/graph/graph-types";
import { loadGraphView } from "../services/graph/view.server";
import { currentShopId } from "../services/shop-context.server";
import prisma from "../db.server";

export const meta: MetaFunction = () => [{ title: "Graph · Syndicate" }];

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
      title="Graph"
      subtitle={subtitleFor(graph)}
      actions={
        <button type="button" className="button button-quiet" onClick={openLabels}>
          Labels
        </button>
      }
      note={
        <p className="compliance-note">
          Harbour Run · Admin Graph reads the same Prisma <code>GraphEdge</code> rows as score_link ·{" "}
          <button type="button" className="link-button" onClick={openLabels}>
            enrichment labels
          </button>
        </p>
      }
    >
      {graph.error ? (
        <div className="banner banner-warning" role="alert">
          <p>Scoring job failed — the occasion graph may be stale.</p>
          <div className="run-actions">
            <button type="button" className="button" onClick={() => revalidator.revalidate()}>
              Retry
            </button>
            <Link className="button button-quiet" to="/app/settings">
              Settings
            </Link>
          </div>
        </div>
      ) : null}

      {graph.emptyReason === "pipeline_incomplete" ? (
        <section className="card graph-panel" aria-busy="true">
          <div className="graph-skeleton" />
          <p className="graph-detail">Graph builds after score_link.</p>
        </section>
      ) : null}

      {graph.emptyReason === "no_edges_after_pipeline" ? (
        <section className="card">
          <div className="card-body">
            <h2>No graph edges yet</h2>
            <p>No graph edges yet — complete store makeup and score, or refresh the store.</p>
            <div className="run-actions">
              <Link className="button" to="/app/settings">
                Settings
              </Link>
              <Link className="button button-quiet" to="/app/settings">
                Refresh store
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {graph.edges.length > 0 ? (
        <>
          {graph.capped ? (
            <p className="muted graph-cap-note">Showing top occasion subgraph · Race-day evidence path</p>
          ) : null}
          <GraphCanvas graph={graph} />
        </>
      ) : null}

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
  if (graph.error) return "Scoring job failed";
  if (graph.emptyReason === "pipeline_incomplete") return "Graph builds after score_link.";
  if (graph.emptyReason === "no_edges_after_pipeline" || graph.edges.length === 0) return "No graph edges yet";
  if (graph.capped) return "Showing top occasion subgraph · Race-day evidence path";
  return "Race-day evidence path";
}
