import { BlockStack, Card, InlineStack, Text } from '@shopify/polaris';
import type { ReactNode } from 'react';
import type { EvidenceKind } from '../../app/data/types.ts';
import { EvidenceBadge } from './EvidenceBadge.tsx';

export function Callout({
  title,
  kind,
  children,
}: {
  title: string;
  kind: EvidenceKind;
  children: ReactNode;
}) {
  return (
    <Card padding="0">
      <div className={`callout callout--${kind}`}>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="start" gap="200" wrap>
            <Text as="h2" variant="headingMd">
              {title}
            </Text>
            <EvidenceBadge kind={kind} />
          </InlineStack>
          {children}
        </BlockStack>
      </div>
    </Card>
  );
}
