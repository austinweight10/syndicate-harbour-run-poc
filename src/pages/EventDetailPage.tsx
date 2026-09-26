import { BlockStack, Button, Card, InlineStack, Layout, Page, ProgressBar, Text } from '@shopify/polaris';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getEvent, personasForEvent } from '../../app/data/fixture.ts';
import { Callout } from '../components/Callout.tsx';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { ResourceMissing } from '../components/ResourceMissing.tsx';
import { ShareList } from '../components/ShareList.tsx';
import { formatConfidence, formatDateTime, formatMoney } from '../lib/format.ts';
import { archetypeLabel } from '../lib/labels.ts';
import { useTitle } from '../lib/useTitle.ts';

export function EventDetailPage() {
  const { eventId = '' } = useParams();
  const event = getEvent(eventId);
  useTitle(event ? event.name : 'Event not found');

  if (!event) {
    return (
      <ResourceMissing
        title="Event not found"
        heading="We couldn’t find that event"
        body="The fixture only includes the three sample occasions. The link may be out of date."
        action="Back to events"
        to="/events"
      />
    );
  }

  const linked = personasForEvent(event.id);

  return (
    <Page
      backAction={{ content: 'Events', url: '/events' }}
      title={event.name}
      subtitle={`${archetypeLabel[event.archetype]} · ${event.dayOfWeek} · ${formatConfidence(event.confidence)} heuristic confidence`}
      titleMetadata={<EvidenceBadge kind="model_hypothesis" />}
    >
      <BlockStack gap="400">
        <Text as="p" variant="bodyMd">
          {event.summary}
        </Text>

        <div className="kpi-grid">
          <Card>
            <BlockStack gap="100">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodySm" tone="subdued">
                  Orders
                </Text>
                <EvidenceBadge kind="observed" />
              </InlineStack>
              <Text as="p" variant="headingXl" numeric>
                {event.orderCount}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {formatDateTime(event.windowStart)} – {formatDateTime(event.windowEnd)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodySm" tone="subdued">
                  Average order value
                </Text>
                <EvidenceBadge kind="observed" />
              </InlineStack>
              <Text as="p" variant="headingXl" numeric>
                {formatMoney(event.aov)}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Enrichment: {event.enrichmentSource === 'orders_only' ? 'orders only' : 'orders plus mock'}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodySm" tone="subdued">
                  Lift
                </Text>
                <EvidenceBadge kind="observed" />
              </InlineStack>
              <Text as="p" variant="headingXl" numeric>
                {event.lift ? `${event.lift.toFixed(1)}×` : '—'}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {event.liftNote ?? 'No baseline lift for this window.'}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                Heuristic confidence
              </Text>
              <Text as="p" variant="headingXl" numeric>
                {formatConfidence(event.confidence)}
              </Text>
              <ProgressBar progress={Math.round(event.confidence * 100)} tone="primary" size="small" />
            </BlockStack>
          </Card>
        </div>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Callout title="What they bought" kind="observed">
              <Text as="p" variant="bodySm" tone="subdued">
                Share of orders in this window by collection.
              </Text>
              <ShareList items={event.topCollections} />
            </Callout>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Callout title="Where baskets shipped" kind="aggregate_proxy">
              <Text as="p" variant="bodySm" tone="subdued">
                {event.geoHint}. City and country shares only — no street, no postcode stored on the buyer.
              </Text>
              <ShareList items={event.geoShares} />
            </Callout>
          </Layout.Section>
        </Layout>

        <Callout title="Why it is named this" kind="model_hypothesis">
          <Text as="p" variant="bodyMd">
            {event.hypothesis}
          </Text>
        </Callout>

        {event.mockNote ? (
          <Callout title="Not a result" kind="mock">
            <Text as="p" variant="bodyMd">
              {event.mockNote}
            </Text>
          </Callout>
        ) : null}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Personas for this event
            </Text>
            {linked.length === 0 ? (
              <Text as="p" variant="bodyMd">
                No persona is tied to this event yet.
              </Text>
            ) : (
              <ul className="link-list">
                {linked.map((persona) => (
                  <li key={persona.id}>
                    <InlineStack align="space-between" blockAlign="center" gap="200" wrap>
                      <RouterLink to={`/personas/${persona.id}`} className="text-link">
                        {persona.name}
                      </RouterLink>
                      <EvidenceBadge kind={persona.nameEvidence} />
                    </InlineStack>
                  </li>
                ))}
              </ul>
            )}
            <Button url="/artifacts">Open artifacts</Button>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
