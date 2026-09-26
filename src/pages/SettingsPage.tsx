import { useState } from 'react';
import { Banner, BlockStack, Button, Card, Checkbox, DescriptionList, InlineStack, Page, Text } from '@shopify/polaris';
import { declaredScopes, ingestStatus } from '../../app/services/ingest.ts';
import { shop } from '../../app/data/fixture.ts';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { formatDateTime, formatMoney } from '../lib/format.ts';
import { useTitle } from '../lib/useTitle.ts';
import { useShopConnection } from '../state/shop-context.ts';

export function SettingsPage() {
  useTitle('Settings');
  const { connected, connect, disconnect } = useShopConnection();
  const ingest = ingestStatus();
  const [agentsAutoRun, setAgentsAutoRun] = useState(true);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  return (
    <Page
      title="Settings"
      subtitle="OAuth is not connected. This screen previews a fixture shop, and the empty state you would see before install."
    >
      <BlockStack gap="400">
        {connected ? (
          <Card>
            <BlockStack gap="400">
              <div className="settings-head">
                <div>
                  <Text as="h2" variant="headingMd">
                    {shop.name}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {shop.domain}
                  </Text>
                </div>
                <EvidenceBadge kind="mock" />
              </div>
              <DescriptionList
                items={[
                  { term: 'Status', description: 'Connected fixture. Not an offline access token.' },
                  { term: 'Vertical', description: shop.vertical },
                  { term: 'Currency', description: shop.currency },
                  { term: 'Timezone', description: 'UK time (Europe/London)' },
                  { term: 'Fixture loaded', description: formatDateTime(shop.syncedAt) },
                  { term: 'Ingest', description: ingest.message },
                ]}
              />
              <Text as="h3" variant="headingSm">
                Scopes declared for a later install
              </Text>
              <ul className="scope-list">
                {declaredScopes.map((item) => (
                  <li key={item.scope}>
                    <code>{item.scope}</code>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ul>
              <Text as="p" variant="bodySm" tone="subdued">
                Not granted in this prototype. Wire authenticateAdmin() in app/shopify.server.ts. Scopes also live in shopify.app.toml.
              </Text>
              <div>
                <Button onClick={disconnect}>Preview empty state</Button>
              </div>
            </BlockStack>
          </Card>
        ) : (
          <Card>
            <div className="empty-shop">
              <img src="/empty.svg" alt="" width={120} height={120} />
              <Text as="h2" variant="headingLg">
                No shop connected
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Install Syndicate on a development store to grant read_products, read_orders, and read_customers. This prototype does not run OAuth yet. Load the Harbour Athletic fixture to walk the demo.
              </Text>
              <div>
                <Button variant="primary" onClick={connect}>
                  Load fixture shop
                </Button>
              </div>
            </div>
          </Card>
        )}

        {refreshNote ? (
          <Banner tone="info" onDismiss={() => setRefreshNote(null)}>
            <p>{refreshNote}</p>
          </Banner>
        ) : null}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Pipeline
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Demo data · fixture shop. Live connect would run stages a→f. This toggle is a stub (D26). HTML SoT: docs/ui/settings.html.
            </Text>
            <Checkbox
              label="Pause auto agents"
              helpText="Default is ON (agents run after personas). Tick to pause the next agents_queue stage. Not wired to a worker."
              checked={!agentsAutoRun}
              onChange={(checked) => setAgentsAutoRun(!checked)}
            />
            <InlineStack gap="200" wrap>
              <Button
                onClick={() =>
                  setRefreshNote(
                    'Refresh store + re-run is a stub. A live shop would start a new PipelineRun (trigger=manual_refresh).',
                  )
                }
              >
                Refresh store + re-run
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Store makeup
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Snapshot from the Harbour Athletic fixture. Not a live StoreMakeupSnapshot.
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Signal sources: football fixtures · weather forecast · social hashtags · virtual events · activity challenges · MOCK.
            </Text>
            <DescriptionList
              items={[
                { term: 'Orders (60d)', description: String(shop.orderCount60d) },
                { term: 'Average order', description: formatMoney(shop.aov60d) },
                { term: 'Vertical', description: shop.vertical },
                { term: 'Top collections', description: 'Home kits · Scarves & hats · Match day essentials' },
                { term: 'Geo buckets', description: 'Bristol · South Gloucestershire · Leeds' },
              ]}
            />
          </BlockStack>
        </Card>

        <div className="two-col">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Web pixel
              </Text>
              <div className="empty-compact">
                <Text as="p" variant="headingSm">
                  Browse history is not connected
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Web pixels are out of scope. Syndicate infers intent from orders and from agent walkthroughs, not from a customer pixel.
                </Text>
              </div>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Other shops
              </Text>
              <div className="empty-compact">
                <Text as="p" variant="headingSm">
                  No other shops
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Syndicate is single-store for the hackathon. A second shop would get its own offline session and its own purge on uninstall.
                </Text>
              </div>
            </BlockStack>
          </Card>
        </div>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Data handling
            </Text>
            <ul className="plain-list">
              <li>Orders, products, and collections only in this fixture. No customer names, email, phone, or street addresses.</li>
              <li>Shipping place is a city or country share, never a full address.</li>
              <li>No wealth, credit, or household scoring. A neighbourhood index, if you add one later, stays an aggregate and stays badged.</li>
              <li>A live agent log should keep a hashed customer id at most. This prototype has no customer ids.</li>
              <li>Uninstall would delete the shop’s Syndicate data. The app/uninstalled webhook is declared, not implemented.</li>
              <li>Agents stop before payment. They do not place orders.</li>
            </ul>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
