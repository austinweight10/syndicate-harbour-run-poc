import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Avatar, personaStatusLabel } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadPersonas } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Shopper · Syndicate" }];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [personas, gate] = await Promise.all([loadPersonas(shopId), loadAgentGate(shopId)]);
  return { persona: personas.find((row) => row.id === params.id) ?? null, gate };
}

const PATH: { icon: IconName; title: string; body: string; stop?: boolean }[] = [
  { icon: "store", title: "Lands on your storefront", body: "Opens the home page like a real visitor would." },
  { icon: "search", title: "Finds key products", body: "Follows the products this shopper actually buys." },
  { icon: "cart", title: "Adds to cart", body: "Checks sizes, stock and delivery on the way." },
  { icon: "stop", title: "Stops before payment", body: "Checkout may open — nothing is ever charged.", stop: true },
];

export default function PersonaDetail() {
  const { persona, gate } = useLoaderData<typeof loader>();
  if (!persona) {
    return (
      <Stub title="Shopper" subtitle="That shopper is not on this shop." back={{ to: "/app/personas", label: "Shoppers" }}>
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="users" size={26} />
          </div>
          <h2>Not found</h2>
          <div className="run-actions">
            <Link className="button button-quiet" to="/app/personas">
              Back to shoppers
            </Link>
          </div>
        </section>
      </Stub>
    );
  }
  const ready = persona.status === "ready";
  return (
    <Stub
      title={persona.name}
      subtitle={ready ? "Ready to browse your storefront." : "Draft — not queued for browsing yet."}
      back={{ to: "/app/personas", label: "Shoppers" }}
      actions={
        ready ? <RunAgentsControls gate={gate} personaIds={[persona.id]} label="Browse as this shopper" /> : null
      }
    >
      <AgentNotices gate={gate} />
      <div className="profile">
        <section className="card settings-card">
          <div className="card-body">
            <div className="persona-head">
              <Avatar initials={persona.initials} seed={persona.name} draft={!ready} large />
              <div>
                <h2>{persona.name}</h2>
                <span className={ready ? "pill pill-success pill-dot" : "pill"}>{personaStatusLabel(persona.status)}</span>
              </div>
            </div>
            <div>
              <p className="subhead" style={{ marginTop: 4 }}>
                Goals
              </p>
              {persona.goals.length > 0 ? (
                <div className="tag-row">
                  {persona.goals.map((goal) => (
                    <span key={goal} className="tag">
                      {goal}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">No goals yet.</p>
              )}
            </div>
            <dl className="kv">
              <dt>Budget</dt>
              <dd>
                £{persona.budgetMin.toFixed(0)}–£{persona.budgetMax.toFixed(0)}
              </dd>
              <dt>Location</dt>
              <dd>{persona.locationProxy ?? "Anywhere"}</dd>
              <dt>Occasion</dt>
              <dd>{persona.eventName ?? "No occasion pinned"}</dd>
            </dl>
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-body">
            <h2>What this shopper does</h2>
            <p className="muted" style={{ margin: 0 }}>
              A fixed, repeatable path through your shop — so you can compare runs over time.
            </p>
            <ol className="path">
              {PATH.map((step) => (
                <li key={step.title} className={step.stop ? "path-stop" : undefined}>
                  <span className="path-dot">
                    <Icon name={step.icon} size={16} />
                  </span>
                  <span>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link to="/app/runs" className="text-link">
              See past runs <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </section>
      </div>
    </Stub>
  );
}
