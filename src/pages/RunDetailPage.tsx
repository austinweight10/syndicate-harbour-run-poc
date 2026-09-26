import { Badge, Banner, BlockStack, Button, Card, InlineStack, Layout, Page, Text } from '@shopify/polaris';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getPersona, getRun, scoresForRun } from '../../app/data/fixture.ts';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { OutcomeBadge } from '../components/OutcomeBadge.tsx';
import { ResourceMissing } from '../components/ResourceMissing.tsx';
import { ScoreMeter } from '../components/ScoreMeter.tsx';
import { formatDateTime, formatDuration, formatMoney, formatTime } from '../lib/format.ts';
import { frictionLabel, targetLabel } from '../lib/labels.ts';
import { useTitle } from '../lib/useTitle.ts';

export function RunDetailPage() {
  const { runId = '' } = useParams();
  const run = getRun(runId);
  useTitle(run ? run.title : 'Run not found');

  if (!run) {
    return (
      <ResourceMissing
        title="Run not found"
        heading="We couldn’t find that run"
        body="Open the run list to see the completed checkout, the Saturday basket, the gift search, and the timeout."
        action="Back to agent runs"
        to="/runs"
      />
    );
  }

  const persona = getPersona(run.personaId);
  const scores = scoresForRun(run.id);
  const basket = run.cart.reduce((sum, line) => sum + line.price, 0);
  const banner = bannerFor(run.outcome);

  return (
    <Page
      backAction={{ content: 'Agent runs', url: '/runs' }}
      title={run.title}
      subtitle={persona ? `${persona.name} · ${formatDateTime(run.startedAt)}` : formatDateTime(run.startedAt)}
      titleMetadata={<OutcomeBadge outcome={run.outcome} />}
    >
      <BlockStack gap="400">
        <Banner tone={banner.tone} title={banner.title}>
          <p>{run.error ?? run.stopNote}</p>
        </Banner>

        <Text as="p" variant="bodyMd">
          {run.summary}
        </Text>

        <div className="meta-grid">
          <Meta label="Viewport" value={run.viewport} />
          <Meta label="Locale" value={run.locale} />
          <Meta label="Duration" value={formatDuration(run.startedAt, run.endedAt)} />
          <Meta label="Status" value={run.status === 'failed' ? 'Failed' : 'Completed'} />
        </div>

        {persona ? (
          <Text as="p" variant="bodySm" tone="subdued">
            Persona:{' '}
            <RouterLink className="text-link" to={`/personas/${persona.id}`}>
              {persona.name}
            </RouterLink>
            . Sample timeline packaged with this prototype. A connected shop would write this from agents/runner.ts.
          </Text>
        ) : null}

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Success criteria
                </Text>
                <ul className="checks">
                  {run.criteria.map((item) => (
                    <li key={item.label}>
                      <Badge tone={item.met ? 'success' : undefined}>{item.met ? 'Met' : 'Not met'}</Badge>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Basket
                </Text>
                {run.cart.length === 0 ? (
                  <Text as="p" variant="bodyMd">
                    Nothing was added.
                  </Text>
                ) : (
                  <ul className="cart">
                    {run.cart.map((line) => (
                      <li key={line.title}>
                        <span>
                          <span className="cart__title">{line.title}</span>
                          <span className="cart__variant">{line.variant}</span>
                        </span>
                        <span className="cart__price">{formatMoney(line.price)}</span>
                      </li>
                    ))}
                    <li className="cart__total">
                      <span>Basket</span>
                      <span>{formatMoney(basket)}</span>
                    </li>
                  </ul>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Timeline
            </Text>
            <ol className="timeline">
              {run.steps.map((step, index) => (
                <li key={step.id} className={`timeline__item timeline__item--${step.tone}`}>
                  <div className="timeline__marker" aria-hidden="true">
                    <span className="timeline__dot" />
                    {index < run.steps.length - 1 ? <span className="timeline__line" /> : null}
                  </div>
                  <div className="timeline__body">
                    <p className="timeline__time">{formatTime(step.at)}</p>
                    <p className="timeline__title">{step.title}</p>
                    <p className="timeline__detail">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </BlockStack>
        </Card>

        {scores.affordances.length + scores.frictions.length > 0 ? (
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Insights from this run
                  </Text>
                  <ul className="score-list">
                    {scores.affordances.map((row) => (
                      <li key={row.id} className="score-row">
                        <div className="score-row__head">
                          <p className="score-row__title">{row.targetLabel}</p>
                          <EvidenceBadge kind={row.evidence} />
                        </div>
                        <p className="score-row__meta">{targetLabel[row.targetType]}</p>
                        <ScoreMeter score={row.score} tone="resonate" />
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Frictions from this run
                  </Text>
                  <ul className="score-list">
                    {scores.frictions.map((row) => (
                      <li key={row.id} className="score-row">
                        <div className="score-row__head">
                          <p className="score-row__title">{row.targetLabel}</p>
                          <EvidenceBadge kind={row.evidence} />
                        </div>
                        <p className="score-row__meta">
                          {targetLabel[row.targetType]} · {frictionLabel[row.frictionKind]}
                        </p>
                        <ScoreMeter score={row.score} tone="friction" />
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        ) : (
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                No scores written
              </Text>
              <Text as="p" variant="bodyMd">
                The run stopped before it could score a collection or a product.
              </Text>
              {run.id === 'run_away_timeout' ? (
                <InlineStack>
                  <Button url="/runs/run_away_dad">Open the completed replay</Button>
                </InlineStack>
              ) : null}
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <p className="meta__label">{label}</p>
      <p className="meta__value">{value}</p>
    </div>
  );
}

function bannerFor(outcome: string): { tone: 'success' | 'info' | 'warning' | 'critical'; title: string } {
  if (outcome === 'failed') return { tone: 'critical', title: 'Run failed' };
  if (outcome === 'checkout_started') return { tone: 'warning', title: 'Stopped before payment' };
  if (outcome === 'abandoned') return { tone: 'warning', title: 'Left without a basket' };
  return { tone: 'info', title: 'Stopped in the basket' };
}
