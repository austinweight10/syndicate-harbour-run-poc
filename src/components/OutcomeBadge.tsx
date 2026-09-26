import { Badge } from '@shopify/polaris';
import type { RunOutcome } from '../../app/data/types.ts';
import { outcomeLabel } from '../lib/labels.ts';

const tone: Record<RunOutcome, 'success' | 'info' | 'warning' | 'critical'> = {
  checkout_started: 'success',
  carted: 'info',
  abandoned: 'warning',
  failed: 'critical',
};

export function OutcomeBadge({ outcome }: { outcome: RunOutcome }) {
  return <Badge tone={tone[outcome]}>{outcomeLabel[outcome]}</Badge>;
}
