import { BlockStack, Card, Layout, Page, Select, Text } from '@shopify/polaris';
import { useSearchParams } from 'react-router-dom';
import { affordancesFor, frictionsFor, getPersona, personas, recommendations } from '../../app/data/fixture.ts';
import type { AffordanceScore, FrictionScore } from '../../app/data/types.ts';
import { Callout } from '../components/Callout.tsx';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { ScoreMeter } from '../components/ScoreMeter.tsx';
import { frictionLabel, targetLabel } from '../lib/labels.ts';
import { useTitle } from '../lib/useTitle.ts';

export function ArtifactsPage() {
  useTitle('Insights');
  const [params, setParams] = useSearchParams();
  const personaId = params.get('persona') ?? 'per_away_day_dad';
  const persona = personaId === 'all' ? undefined : getPersona(personaId);
  const known = personaId === 'all' || Boolean(persona);
  const resonate = known ? affordancesFor(personaId) : [];
  const friction = known ? frictionsFor(personaId) : [];
  const fix = recommendations[personaId] ?? recommendations.all;

  const subtitle = persona
    ? `These scores show how a shopper like ${persona.name} moved through the store. The persona name is badged on its own screen. No payment was taken — runs stop at checkout.`
    : 'These scores show how the fixture personas moved through the store. No payment was taken — runs stop at checkout.';

  return (
    <Page title="Insights" subtitle={subtitle}>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200">
            <div className="filter-narrow">
              <Select
                label="Persona"
                options={[
                  { label: 'All personas', value: 'all' },
                  ...personas.map((item) => ({ label: item.name, value: item.id })),
                ]}
                value={known ? personaId : 'all'}
                onChange={(value) => {
                  if (value === 'per_away_day_dad') {
                    setParams({});
                  } else {
                    setParams({ persona: value });
                  }
                }}
              />
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              Scores run from 0 to 1. A high Insights score means the page helped. A high Frictions score means it got in the way.
            </Text>
          </BlockStack>
        </Card>

        {!known ? (
          <Card>
            <Text as="p" variant="bodyMd">
              That persona is not in the fixture. Choose another filter.
            </Text>
          </Card>
        ) : (
          <Layout>
            <Layout.Section variant="oneHalf">
              <ScoreColumn
                title="Insights"
                lede="Higher means the site helped."
                empty="No insight scores for this filter."
                tone="resonate"
                rows={resonate}
              />
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <ScoreColumn
                title="Frictions"
                lede="Higher means the site got in the way."
                empty="No friction scores for this filter."
                tone="friction"
                rows={friction}
              />
            </Layout.Section>
          </Layout>
        )}

        <Callout title={fix.title} kind={fix.evidence}>
          <Text as="p" variant="bodyMd">
            {fix.body}
          </Text>
        </Callout>
      </BlockStack>
    </Page>
  );
}

function ScoreColumn({
  title,
  lede,
  empty,
  tone,
  rows,
}: {
  title: string;
  lede: string;
  empty: string;
  tone: 'resonate' | 'friction';
  rows: Array<AffordanceScore | FrictionScore>;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            {lede}
          </Text>
        </BlockStack>
        {rows.length === 0 ? (
          <Text as="p" variant="bodyMd">
            {empty}
          </Text>
        ) : (
          <ul className="score-list">
            {rows.map((row) => (
              <li key={row.id} className="score-row">
                <div className="score-row__head">
                  <div>
                    <p className="score-row__title">{row.targetLabel}</p>
                    <p className="score-row__meta">
                      {targetLabel[row.targetType]}
                      {'frictionKind' in row ? ` · ${frictionLabel[row.frictionKind]}` : ''}
                    </p>
                  </div>
                  <EvidenceBadge kind={row.evidence} />
                </div>
                <ScoreMeter score={row.score} tone={tone} />
                <p className="score-row__note">{row.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </BlockStack>
    </Card>
  );
}
