import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { Stub } from "../components/Stub";
import { ConfidenceBar, ProvenanceChips } from "../components/Provenance";
import { loadEventList } from "../services/board.server";
import { currentShopId } from "../services/shop-context.server";

export const meta: MetaFunction = () => [{ title: "Events · Syndicate" }];

export async function loader({ request }: LoaderFunctionArgs) {
  return loadEventList(await currentShopId(request));
}

export default function EventsIndex() {
  const events = useLoaderData<typeof loader>();
  return (
    <Stub
      title="Events"
      subtitle={
        events.length
          ? "Occasion candidates scored from Harbour Run orders and the running calendar."
          : "No occasions yet. Run npm run pipeline:demo, then refresh."
      }
    >
      {events.length === 0 ? (
        <section className="card">
          <div className="card-body">
            <h2>Nothing scored</h2>
            <p className="muted">
              This list reads EventCandidate rows. It does not import the sports catalogue into the
              route.
            </p>
          </div>
        </section>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <article key={event.id} className="card event-card">
              <div className="card-body">
                <div className="split">
                  <p className="eyebrow">{event.archetype.replaceAll("_", " ")}</p>
                  <ProvenanceChips kinds={event.provenance} />
                </div>
                <h2>
                  <Link to={`/app/events/${event.id}`}>{event.name}</Link>
                </h2>
                <ConfidenceBar value={event.confidence} />
                <p className="muted">
                  {event.city ?? "No venue"} · {event.nOrders} orders
                  {event.lowN ? " · early signal" : ""}
                </p>
                <p>{event.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Stub>
  );
}
