import { useState } from 'react';
import { Banner, BlockStack, Button, Card, InlineStack, Layout, Page, Text } from '@shopify/polaris';
import { Link } from 'react-router-dom';
import { recommendations, runsNewestFirst, shop } from '../../app/data/fixture.ts';
import { Callout } from '../components/Callout.tsx';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { OrderChart } from '../components/OrderChart.tsx';
import { OutcomeBadge } from '../components/OutcomeBadge.tsx';
import { evidenceCopy } from '../lib/labels.ts';
import { formatDateTime, formatMoney } from '../lib/format.ts';
import { useTitle } from '../lib/useTitle.ts';
import type { EvidenceKind } from '../../app/data/types.ts';

const steps = [
  {
    n: '1',
    to: '/events/evt_match_day_home',
    title: 'Match-day home kit rush',
    body: 'Saturday 19 Sept. 86 orders, 3.4× a normal Saturday.',
  },
  {
    n: '2',
    to: '/personas/per_away_day_dad',
    title: 'Away-day dad',
    body: 'Adult L, £40–£80, and a name we refuse to treat as fact.',
  },
  {
    n: '3',
    to: '/runs/run_away_dad',
    title: 'Completed run',
    body: 'Home to checkout start this morning, then a hard stop.',
  },
  {
    n: '4',
    to: '/artifacts?persona=per_away_day_dad',
    title: 'Insights and frictions',
    body: 'Away kits helped. Search and the size guide did not.',
  },
];

const recent = runsNewestFirst().slice(0, 3);

export function OverviewPage() {
  useTitle('Overview');
  const [showBanner, setShowBanner] = useState(true);
  const fix = recommendations.all;

  return (
    <Page
      title="Overview"
      subtitle="Stop guessing match-day merch. This fixture shows the Saturday spike, the away-day shopper, and where the site got in the way."
      primaryAction={{ content: 'Open completed run', url: '/runs/run_away_dad' }}
      secondaryActions={[{ content: 'Match-day event', url: '/events/evt_match_day_home' }]}
    >
      <BlockStack gap="400">
        {showBanner ? (
          <Banner tone="info" title="Harbour Athletic fixture" onDismiss={() => setShowBanner(false)}>
            <p>
              Sample sport-merch orders for the last 60 days. Shopify OAuth is stubbed, so nothing here is a live shop.
              Agent runs stop before payment.
            </p>
          </Banner>
        ) : null}

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center" wrap>
              <InlineStack gap="200" blockAlign="center" wrap>
                <span className="pill">Demo data</span>
                <Text as="h2" variant="headingMd">
                  Pipeline
                </Text>
              </InlineStack>
              <span className="pill">Complete</span>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Fixture shop · all stages complete · recommendations ready. Live OAuth would run stages a→f. See docs/ui/ for the HTML SoT.
            </Text>
            <ol className="pipeline-strip">
              {[
                'Ingesting store makeup',
                'Seeding graph',
                'Refreshing events',
                'Scoring occasions',
                'Materialising personas',
                'Agents running',
              ].map((label) => (
                <li key={label} className="pipeline-strip__step pipeline-strip__step--done">
                  {label}
                </li>
              ))}
            </ol>
          </BlockStack>
        </Card>

        <div className="kpi-grid">
          <Kpi label="Orders in the fixture" value={String(shop.orderCount60d)} detail="Last 60 days" />
          <Kpi label="Store average order" value={formatMoney(shop.aov60d)} detail="Across the 60 days" />
          <Kpi label="Events" value="3" detail="Home rush, away weekend, gifts" />
          <Kpi label="Latest run" value="Checkout" detail="Stopped before payment" />
        </div>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Walk the demo
            </Text>
            <div className="steps">
              {steps.map((step) => (
                <Link key={step.to} to={step.to} className="step">
                  <span className="step__n">{step.n}</span>
                  <span className="step__title">{step.title}</span>
                  <span className="step__body">{step.body}</span>
                </Link>
              ))}
            </div>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="start" gap="200" wrap>
                  <Text as="h2" variant="headingMd">
                    Order rhythm
                  </Text>
                  <EvidenceBadge kind="observed" />
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  {shop.orderCount60d} orders in the fixture. The chart is the fortnight that holds the three events.
                  95 orders sit outside these dates.
                </Text>
                <OrderChart />
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Callout title={fix.title} kind={fix.evidence}>
              <Text as="p" variant="bodyMd">
                {fix.body}
              </Text>
              <Button url="/artifacts">Review resonates and insights</Button>
            </Callout>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              How to read the badges
            </Text>
            <div className="badge-legend">
              {(Object.keys(evidenceCopy) as EvidenceKind[]).map((kind) => (
                <div key={kind} className="badge-legend__item">
                  <EvidenceBadge kind={kind} />
                  <Text as="p" variant="bodySm">
                    {evidenceCopy[kind].hint}
                  </Text>
                </div>
              ))}
            </div>
          </BlockStack>
        </Card>

        <Card padding="0">
          <div className="card-pad">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Recent agent runs
              </Text>
              <Button url="/runs" variant="plain">
                All runs
              </Button>
            </InlineStack>
          </div>
          <ul className="run-list">
            {recent.map((run) => (
              <li key={run.id}>
                <Link to={`/runs/${run.id}`} className="run-list__link">
                  <span>
                    <span className="run-list__title">{run.title}</span>
                    <span className="run-list__meta">{formatDateTime(run.startedAt)}</span>
                  </span>
                  <OutcomeBadge outcome={run.outcome} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </BlockStack>
    </Page>
  );
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="headingXl" numeric>
          {value}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {detail}
        </Text>
      </BlockStack>
    </Card>
  );
}
