import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Icon } from "../components/Icon";
import { ConfidenceRing, ProvenanceChips } from "../components/Provenance";
import { Stub } from "../components/Stub";
import { loadEventList } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Occasions · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  return loadEventList(await currentShopId(request));
}

export default function EventsIndex() {
  const events = useLoaderData<typeof loader>();
  return (
    <Stub
      title="Occasions"
      subtitle={
        events.length
          ? `${events.length} shopping moments scored from your orders and the running calendar — strongest first.`
          : "No occasions scored yet."
      }
      actions={
        events.length ? (
          <Link to="/app/graph" className="button button-quiet">
            <Icon name="graph" size={15} /> Evidence graph
          </Link>
        ) : null
      }
    >
      {events.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-icon">
            <Icon name="flag" size={26} />
          </div>
          <h2>Nothing scored yet</h2>
          <p className="muted">
            Occasions are shopping moments we detect from orders — race weekends, weather shifts, and related product
            demand. When scoring finishes they appear here with confidence and evidence labels.
          </p>
          <div className="run-actions">
            <Link className="button button-quiet" to="/app">
              Back to Overview
            </Link>
          </div>
        </section>
      ) : (
        <div className="event-grid stagger">
          {events.map((event) => (
            <article key={event.id} className="card card-link event-card">
              <div className="card-body">
                <div className="event-card-top">
                  <div style={{ minWidth: 0 }}>
                    <p className="eyebrow">{event.archetype.replaceAll("_", " ")}</p>
                    <h2>
                      <Link to={`/app/events/${event.id}`} className="stretched">
                        {event.name}
                      </Link>
                    </h2>
                  </div>
                  <ConfidenceRing value={event.confidence} size={66} stroke={7} />
                </div>
                <div className="meta-row">
                  <span className="meta-item">
                    <Icon name="pin" size={13} /> {event.city ?? "No venue"}
                  </span>
                  <span className="meta-item">
                    <Icon name="bag" size={13} /> {event.nOrders} orders
                  </span>
                  {event.windowLabel ? (
                    <span className="meta-item">
                      <Icon name="clock" size={13} /> {event.windowLabel}
                    </span>
                  ) : null}
                </div>
                <p className="blurb">{event.blurb}</p>
                <div className="event-card-foot">
                  <ProvenanceChips kinds={event.provenance} />
                  {event.lowN ? <span className="tag tag-warn">Early signal</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Stub>
  );
}
