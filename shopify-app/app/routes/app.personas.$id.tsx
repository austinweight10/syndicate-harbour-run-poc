import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadPersonas } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Persona · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [personas, gate] = await Promise.all([loadPersonas(shopId), loadAgentGate(shopId)]);
  return { persona: personas.find((row) => row.id === params.id) ?? null, gate };
}

export default function PersonaDetail() {
  const { persona, gate } = useLoaderData<typeof loader>();
  if (!persona) {
    return (
      <Stub title="Persona" subtitle="That persona is not on this shop.">
        <Link to="/app/personas">Back to personas</Link>
      </Stub>
    );
  }
  const ready = persona.status === "ready";
  return (
    <Stub
      title={persona.name}
      subtitle={ready ? "Ready to shop the storefront." : `${persona.status} — not queued.`}
      actions={
        ready ? (
          <RunAgentsControls gate={gate} personaIds={[persona.id]} label="Run as this persona" />
        ) : null
      }
    >
      <AgentNotices gate={gate} />
      <section className="card">
        <div className="card-body">
          <p>{persona.goals.join(" · ") || "No goals yet."}</p>
          <p className="muted">
            £{persona.budgetMin.toFixed(0)}–£{persona.budgetMax.toFixed(0)}
            {persona.locationProxy ? ` · ${persona.locationProxy}` : ""}
          </p>
          <p className="muted">{persona.eventName ? `Occasion: ${persona.eventName}` : "No occasion pinned."}</p>
          <p>
            The shopper follows path-harbour-run-dawn: Race Kits, the youth tee, cart, then checkout.
            It never pays.
          </p>
          <p>
            <Link to="/app/personas">All personas</Link>
          </p>
        </div>
      </section>
    </Stub>
  );
}
