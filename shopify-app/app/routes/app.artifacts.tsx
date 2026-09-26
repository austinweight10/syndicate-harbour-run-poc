import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Stub } from "../components/Stub";
import { RunAgentsControls, StopBeforePay } from "../components/RunAgents";
import { ProvenanceChips } from "../components/Provenance";
import { loadAgentGate } from "../services/agents/gate";
import { loadBoard, type BoardCard } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Insights · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [board, gate] = await Promise.all([loadBoard(shopId), loadAgentGate(shopId)]);
  return { board, gate };
}

export default function InsightsBoard() {
  const { board, gate } = useLoaderData<typeof loader>();
  const empty = board.insights.length === 0 && board.frictions.length === 0;
  const agentCards = [...board.insights, ...board.frictions].filter((card) => card.agentClaim && card.runId);
  return (
    <Stub
      title="Insights"
      subtitle="Graph cards from orders, and shopper cards only after a Playwright run. No payment was taken."
      actions={<RunAgentsControls gate={gate} />}
    >
      <StopBeforePay />
      {agentCards.length === 0 ? (
        <div className="banner" role="status">
          Run agents to generate Insights and Frictions for this shop. <Link to="/app/runs">Agent runs</Link>
        </div>
      ) : null}
      {empty ? (
        <section className="card">
          <div className="card-body">
            <h2>Board is empty</h2>
            <p className="muted">
              Recommendations are written by the demo pipeline into SQLite. Run{" "}
              <code>npm run pipeline:demo</code> and refresh.
            </p>
          </div>
        </section>
      ) : (
        <div className="board">
          <section>
            <h2 className="column-title">Insights</h2>
            {board.insights.length === 0 ? (
              <p className="muted">No positive affordance yet.</p>
            ) : (
              board.insights.map((card) => <CardView key={card.id} card={card} />)
            )}
          </section>
          <section>
            <h2 className="column-title">Frictions</h2>
            {board.frictions.length === 0 ? (
              <p className="muted">No friction cards yet.</p>
            ) : (
              board.frictions.map((card) => <CardView key={card.id} card={card} />)
            )}
          </section>
        </div>
      )}
    </Stub>
  );
}

function CardView({ card }: { card: BoardCard }) {
  return (
    <article className="card">
      <div className="card-body">
        <div className="split">
          <p className="eyebrow">{card.priority ?? "Signal"}{card.kind ? ` · ${card.kind}` : ""}</p>
          <ProvenanceChips kinds={card.provenance} />
        </div>
        <h2>{card.title}</h2>
        <p>{card.body}</p>
        <p className="muted">
          {card.personaName ? `${card.personaName}` : "No persona"}
          {card.eventName ? (
            <>
              {" · "}
              <Link to={`/app/events/${card.eventId}`}>{card.eventName}</Link>
            </>
          ) : null}
          {card.confidence != null ? ` · ${Math.round(card.confidence * 100)}%` : ""}
        </p>
        {card.agentClaim && card.runId ? (
          <p className="muted">
            Agent run <Link to={`/app/runs/${card.runId}`}><code>{card.runId}</code></Link>
            {card.provenance.includes("MOCK")
              ? " · replay hydrate, not a live shopper."
              : " · Playwright shopper. Stopped before payment."}
          </p>
        ) : (
          <p className="muted">From the order graph. Not attributed to an agent.</p>
        )}
      </div>
    </article>
  );
}
