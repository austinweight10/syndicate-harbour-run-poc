import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Stub } from "../components/Stub";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { loadAgentGate } from "../services/agents/gate";
import { loadPersonas } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Personas · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [personas, gate] = await Promise.all([loadPersonas(shopId), loadAgentGate(shopId)]);
  return { personas, gate };
}

export default function Personas() {
  const { personas, gate } = useLoaderData<typeof loader>();
  return (
    <Stub
      title="Personas"
      subtitle="Race-day taper and wet-weather trainer, linked to scored occasions."
      actions={<RunAgentsControls gate={gate} />}
    >
      <AgentNotices gate={gate} />
      {personas.length === 0 ? (
        <section className="card">
          <div className="card-body">
            <h2>No personas</h2>
            <p className="muted">They are written when the demo pipeline derives them from the graph.</p>
          </div>
        </section>
      ) : (
        <div className="event-grid">
          {personas.map((persona) => (
            <article key={persona.id} className={persona.stub ? "card is-stub" : "card"}>
              <div className="card-body">
                <div className="split">
                  <span className="avatar" aria-hidden="true">{persona.initials}</span>
                  <span className="pill">{persona.status}</span>
                </div>
                <h2>
                  <Link to={`/app/personas/${persona.id}`}>{persona.name}</Link>
                </h2>
                <p>{persona.goals.join(" · ") || "No goals yet."}</p>
                <p className="muted">
                  £{persona.budgetMin.toFixed(0)}–£{persona.budgetMax.toFixed(0)}
                  {persona.locationProxy ? ` · ${persona.locationProxy}` : ""}
                </p>
                <p className="muted">
                  {persona.eventName ? `Occasion: ${persona.eventName}` : "No occasion pinned."}
                  {persona.stub ? " · Stub. Not used for confidence." : ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Stub>
  );
}
