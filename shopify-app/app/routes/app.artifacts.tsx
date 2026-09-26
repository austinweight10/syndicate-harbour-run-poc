import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Stub } from "../components/Stub";
import { RunAgentsControls, StopBeforePay } from "../components/RunAgents";
import { RunPoller } from "../components/RunPoller";
import { ProvenanceChips } from "../components/Provenance";
import { StorefrontActionPanel } from "../components/StorefrontAction";
import { loadAgentGate } from "../services/agents/gate";
import { loadBoard, type BoardCard } from "../services/board.server";
import { loadBoardActions, type ActionView } from "../services/actions/board.server";
import { applyAction, undoAction } from "../services/actions/apply.server";
import { redraftAction } from "../services/actions/propose.server";
import { ensureWriteProducts } from "../services/actions/write-scope.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Insights · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [board, gate] = await Promise.all([loadBoard(shopId), loadAgentGate(shopId)]);
  const actions = await loadBoardActions(shopId, board);
  return { board, gate, actions };
}

export async function action({ request }: ActionFunctionArgs) {
  const shopId = await currentShopId(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const actionId = String(form.get("actionId") ?? "");
  const cardId = String(form.get("cardId") ?? "");
  if (intent === "apply" || intent === "undo") {
    // Throws a Shopify redirect when write_products is not yet granted.
    await ensureWriteProducts(request, shopId);
    return intent === "apply" ? applyAction(shopId, actionId) : undoAction(shopId, actionId);
  }
  if (intent === "redraft") {
    await redraftAction(shopId, cardId);
    return { ok: true as const, simulated: false, message: "Asking the agent again…" };
  }
  return { ok: false as const, message: "Unknown action." };
}

export default function InsightsBoard() {
  const { board, gate, actions } = useLoaderData<typeof loader>();
  const empty = board.insights.length === 0 && board.frictions.length === 0;
  const agentCards = [...board.insights, ...board.frictions].filter((card) => card.agentClaim && card.runId);
  return (
    <Stub
      title="Insights"
      subtitle="What to lean into, and what may block a shopper — from order data and storefront runs."
      actions={<RunAgentsControls gate={gate} />}
    >
      <StopBeforePay />
      {actions.drafting ? (
        <div className="callout callout-info" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>
            {actions.agentOn
              ? "The agent is drafting a one-click fix for each card…"
              : "Drafting a one-click fix for each card…"}
          </span>
        </div>
      ) : null}
      <RunPoller live={actions.drafting} quiet />
      {agentCards.length === 0 && !empty ? (
        <div className="banner" role="status">
          Cards below come from order data. Watch shoppers browse to add storefront findings.{" "}
          <Link to="/app/runs">Shopper runs</Link>
        </div>
      ) : null}
      {empty ? (
        <section className="card">
          <div className="card-body">
            <h2>Nothing on the board yet</h2>
            <p>
              Insights appear after occasions are scored from your orders. Shopper runs can add
              extra findings from a live browse.
            </p>
            <p className="muted">
              If this is a demo shop and the board stays empty, finish store setup, then reload.
            </p>
            <p>
              <Link to="/app">Back to Overview</Link>
              {" · "}
              <Link to="/app/settings">Settings</Link>
            </p>
          </div>
        </section>
      ) : (
        <div className="board">
          <section>
            <h2 className="column-title">Insights</h2>
            <p className="column-hint muted">Opportunities worth leaning into</p>
            {board.insights.length === 0 ? (
              <p className="muted">No opportunities yet.</p>
            ) : (
              board.insights.map((card) => (
                <CardView key={card.id} card={card} action={actions.byCard[card.id]} drafting={actions.drafting} />
              ))
            )}
          </section>
          <section>
            <h2 className="column-title">Blockers</h2>
            <p className="column-hint muted">Friction that may stop a purchase</p>
            {board.frictions.length === 0 ? (
              <p className="muted">No blockers found yet.</p>
            ) : (
              board.frictions.map((card) => (
                <CardView key={card.id} card={card} action={actions.byCard[card.id]} drafting={actions.drafting} />
              ))
            )}
          </section>
        </div>
      )}
    </Stub>
  );
}

function CardView({
  card,
  action,
  drafting,
}: {
  card: BoardCard;
  action: ActionView | undefined;
  drafting: boolean;
}) {
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
          {card.personaName ? card.personaName : "From order data"}
          {card.eventName ? (
            <>
              {" · "}
              <Link to={`/app/events/${card.eventId}`}>{card.eventName}</Link>
            </>
          ) : null}
          {card.confidence != null ? ` · ${Math.round(card.confidence * 100)}% confidence` : ""}
        </p>
        {card.agentClaim && card.runId ? (
          <p className="muted">
            From a{" "}
            <Link to={`/app/runs/${card.runId}`}>shopper run</Link>
            {card.provenance.includes("MOCK")
              ? " · replay / demo, not a live browse."
              : " · stopped before payment."}
          </p>
        ) : (
          <p className="muted">From the order graph — not from a storefront browse.</p>
        )}
      </div>
      <StorefrontActionPanel cardId={card.id} action={action} drafting={drafting} />
    </article>
  );
}
