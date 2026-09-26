import { Banner, BlockStack, Button, Card, InlineStack, Layout, List, Page, Text } from '@shopify/polaris';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getEvent, getPersona, runsForPersona } from '../../app/data/fixture.ts';
import type { Trait } from '../../app/data/types.ts';
import { Callout } from '../components/Callout.tsx';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { OutcomeBadge } from '../components/OutcomeBadge.tsx';
import { ResourceMissing } from '../components/ResourceMissing.tsx';
import { formatDateTime, formatMoney } from '../lib/format.ts';
import { useTitle } from '../lib/useTitle.ts';

export function PersonaDetailPage() {
  const { personaId = '' } = useParams();
  const persona = getPersona(personaId);
  useTitle(persona ? persona.name : 'Persona not found');

  if (!persona) {
    return (
      <ResourceMissing
        title="Persona not found"
        heading="We couldn’t find that persona"
        body="The fixture includes Away-day dad, Match-day regular, and Saturday gift sender."
        action="Back to personas"
        to="/personas"
      />
    );
  }

  const event = getEvent(persona.eventId);
  const runs = runsForPersona(persona.id);

  return (
    <Page
      backAction={{ content: 'Personas', url: '/personas' }}
      title={persona.name}
      subtitle={event ? `Linked event · ${event.name}` : 'No linked event'}
      titleMetadata={<EvidenceBadge kind={persona.nameEvidence} />}
      primaryAction={{ content: 'See artifacts', url: `/artifacts?persona=${persona.id}` }}
      secondaryActions={[{ content: 'Agent runs', url: '/runs' }]}
    >
      <BlockStack gap="400">
        {persona.mockNote ? (
          <Banner tone="warning" title="This name is a mock">
            <p>{persona.mockNote}</p>
          </Banner>
        ) : (
          <Banner tone="info" title="This name is a hypothesis">
            <p>The label describes a basket pattern. It is not a customer attribute and it is not stored on the order.</p>
          </Banner>
        )}

        <Text as="p" variant="bodyMd">
          {persona.summary}
        </Text>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Goals
                </Text>
                <List type="bullet">
                  {persona.goals.map((goal) => (
                    <List.Item key={goal}>{goal}</List.Item>
                  ))}
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Callout title="Budget" kind="observed">
              <Text as="p" variant="headingLg" numeric>
                {formatMoney(persona.budgetMin)} – {formatMoney(persona.budgetMax)}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {persona.budgetNote} Soft constraint for the agent: prefer in-range products, and record price shock if nothing fits.
              </Text>
            </Callout>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Constraints
            </Text>
            <FactList items={persona.constraints} />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Behaviour
            </Text>
            <FactList items={persona.behaviouralTraits} />
          </BlockStack>
        </Card>

        <Callout title="Location proxy" kind={persona.locationEvidence}>
          <Text as="p" variant="bodyMd">
            {persona.locationProxy}
          </Text>
        </Callout>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Success for a run
            </Text>
            <List type="number">
              {persona.successCriteria.map((item) => (
                <List.Item key={item}>{item}</List.Item>
              ))}
            </List>
            <Text as="p" variant="bodySm" tone="subdued">
              Payment is never a success criterion. Runs stop at checkout start.
            </Text>
          </BlockStack>
        </Card>

        {persona.mockFlags.length > 0 ? (
          <Callout title="Mock flags on this persona" kind="mock">
            <ul className="plain-list">
              {persona.mockFlags.map((flag) => (
                <li key={flag}>
                  <code>{flag}</code>
                </li>
              ))}
            </ul>
            <Text as="p" variant="bodySm" tone="subdued">
              demographic_proxy_mock means the display name borrows a household role. Do not export it to ads or customer tags.
            </Text>
          </Callout>
        ) : null}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Runs
            </Text>
            <ul className="link-list">
              {runs.map((run) => (
                <li key={run.id}>
                  <InlineStack align="space-between" blockAlign="center" gap="200" wrap>
                    <RouterLink to={`/runs/${run.id}`} className="text-link">
                      {run.title}
                      <span className="run-list__meta"> · {formatDateTime(run.startedAt)}</span>
                    </RouterLink>
                    <OutcomeBadge outcome={run.outcome} />
                  </InlineStack>
                </li>
              ))}
            </ul>
            <Button url={`/artifacts?persona=${persona.id}`}>Open resonates and insights</Button>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

function FactList({ items }: { items: Trait[] }) {
  return (
    <ul className="facts">
      {items.map((item) => (
        <li key={item.label} className="fact">
          <div>
            <p className="fact__label">{item.label}</p>
            <p className="fact__value">{item.value}</p>
          </div>
          <EvidenceBadge kind={item.evidence} />
        </li>
      ))}
    </ul>
  );
}
