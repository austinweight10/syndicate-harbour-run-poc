import { IndexTable, Link, Page, Text } from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { events } from '../../app/data/fixture.ts';
import { formatConfidence, formatDate, formatMoney } from '../lib/format.ts';
import { archetypeLabel } from '../lib/labels.ts';
import { useCondensed } from '../lib/useCondensed.ts';
import { useTitle } from '../lib/useTitle.ts';

export function EventsPage() {
  useTitle('Events');
  const navigate = useNavigate();
  const condensed = useCondensed();

  return (
    <Page
      title="Events"
      subtitle="Names are hypotheses. Order counts, dates, and basket mix are observed. Filter later by Physical / Virtual / Hybrid. Open a row for geography and the calendar join."
    >
      <div className="table-card">
        <IndexTable
          resourceName={{ singular: 'event', plural: 'events' }}
          itemCount={events.length}
          selectable={false}
          condensed={condensed}
          headings={[
            { title: 'Event' },
            { title: 'Window' },
            { title: 'Orders', alignment: 'end' },
            { title: 'AOV', alignment: 'end' },
            { title: 'Shipping hint' },
            { title: 'Confidence', alignment: 'end' },
          ]}
        >
          {events.map((event, index) => (
            <IndexTable.Row id={event.id} key={event.id} position={index} onClick={() => navigate(`/events/${event.id}`)}>
              <IndexTable.Cell>
                <Link dataPrimaryLink url={`/events/${event.id}`} removeUnderline>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {event.name}
                  </Text>
                </Link>
                <div className="cell-sub">{archetypeLabel[event.archetype]}</div>
              </IndexTable.Cell>
              <IndexTable.Cell>
                {formatDate(event.windowStart)} – {formatDate(event.windowEnd)}
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" numeric>
                  {event.orderCount}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" numeric>
                  {formatMoney(event.aov)}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>{event.geoHint}</IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" numeric>
                  {formatConfidence(event.confidence)}
                </Text>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </div>
    </Page>
  );
}
