import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Avatar, personaStatusLabel } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { AgentNotices, RunAgentsControls } from "../components/RunAgents";
import { Stub } from "../components/Stub";
import { loadAgentGate } from "../services/agents/gate";
import { loadPersonas } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Shoppers · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const shopId = await currentShopId(request);
  const [personas, gate] = await Promise.all([loadPersonas(shopId), loadAgentGate(shopId)]);
  return { personas, gate };
}

export default function Personas() {
  const { personas, gate } = useLoaderData<typeof loader>();
  const sorted = [...personas].sort((a, b) => Number(a.stub) - Number(b.stub) || (a.status === "ready" ? -1 : 1));
  return (
    <Stub
      title="Shoppers"
      subtitle="Personas built from the people who actually buy — ready ones can browse your storefront for you."
      actions={<RunAgentsControls gate={gate} />}
    >
      <AgentNotices gate={gate} />
      {personas.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="users" size={26} />
          </div>
          <h2>No shoppers yet</h2>
          <p className="muted">
            Shopper personas are built from scored occasions. Once they appear, you can watch ready ones browse your
            storefront.
          </p>
          <div className="run-actions">
            <Link className="button button-quiet" to="/app">
              Back to Overview
            </Link>
          </div>
        </section>
      ) : (
        <div className="event-grid stagger">
          {sorted.map((persona) => {
            const ready = persona.status === "ready";
            return (
              <article key={persona.id} className={persona.stub ? "card card-link persona-card is-stub" : "card card-link persona-card"}>
                <div className="card-body">
                  <div className="persona-head">
                    <Avatar initials={persona.initials} seed={persona.name} draft={!ready} large />
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        <Link to={`/app/personas/${persona.id}`} className="stretched">
                          {persona.name}
                        </Link>
                      </h2>
                      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                        {persona.stub ? "Draft — not used for confidence" : persona.vertical ?? "Runner"}
                      </p>
                    </div>
                    <span className={ready ? "pill pill-success pill-dot" : "pill"}>{personaStatusLabel(persona.status)}</span>
                  </div>
                  {persona.productLabels.length > 0 ? (
                    <div className="tag-row">
                      {persona.productLabels.slice(0, 3).map((label) => (
                        <span key={label} className="tag tag-product">
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : persona.goals.length > 0 ? (
                    <div className="tag-row">
                      {persona.goals.map((goal) => (
                        <span key={goal} className="tag">
                          {typeof goal === "string" ? goal : String(goal)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ margin: 0 }}>
                      No product likes yet.
                    </p>
                  )}
                  <div className="persona-facts">
                    <span className="fact">
                      <Icon name="card" size={14} />
                      <span>
                        Usually £{persona.budgetMin.toFixed(0)}–£{persona.budgetMax.toFixed(0)}
                      </span>
                    </span>
                    <span className="fact">
                      <Icon name="pin" size={14} />
                      <span>{persona.locationProxy ?? "Anywhere"}</span>
                    </span>
                    {persona.facts.shopStyle ? (
                      <span className="fact">
                        <Icon name="search" size={14} />
                        <span>{persona.facts.shopStyle}</span>
                      </span>
                    ) : null}
                    {persona.facts.device ? (
                      <span className="fact">
                        <Icon name="zap" size={14} />
                        <span>{persona.facts.device}</span>
                      </span>
                    ) : null}
                    <span className="fact" style={{ gridColumn: "1 / -1" }}>
                      <Icon name="flag" size={14} />
                      <span>{persona.eventName ? `Shopping for ${persona.eventName}` : "No occasion pinned yet"}</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Stub>
  );
}
