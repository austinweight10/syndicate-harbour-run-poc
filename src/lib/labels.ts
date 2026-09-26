import type { Archetype, EvidenceKind, FrictionKind, RunOutcome, TargetType } from '../../app/data/types.ts';

export const evidenceCopy: Record<EvidenceKind, { label: string; hint: string }> = {
  observed: {
    label: 'OBSERVED',
    hint: 'Counted from fixture orders, or seen by the agent on the page.',
  },
  aggregate_proxy: {
    label: 'AGGREGATE PROXY',
    hint: 'A place or basket pattern. Never a single buyer.',
  },
  model_hypothesis: {
    label: 'MODEL HYPOTHESIS',
    hint: 'A name, a calendar join, or a bet about what to change.',
  },
  mock: {
    label: 'MOCK',
    hint: 'Invented for the demo, or a demographic shorthand we refuse to treat as fact.',
  },
};

export const archetypeLabel: Record<Archetype, string> = {
  match_day: 'Match day',
  festival: 'Festival',
  date_night: 'Date night',
  seasonal_drop: 'Seasonal drop',
  other: 'Other',
};

export const frictionLabel: Record<FrictionKind, string> = {
  dead_end: 'Dead end',
  missing_variant: 'Missing variant',
  weak_copy: 'Weak copy',
  ux_trap: 'Hard to use',
  price_shock: 'Price shock',
  trust: 'Trust',
};

export const targetLabel: Record<TargetType, string> = {
  product: 'Product',
  collection: 'Collection',
  copy: 'Copy',
  nav: 'Navigation',
  filter: 'Filter',
  page: 'Page',
  checkout: 'Checkout',
  sizing: 'Sizing',
  search: 'Search',
};

export const outcomeLabel: Record<RunOutcome, string> = {
  carted: 'In the basket',
  checkout_started: 'Checkout started',
  abandoned: 'Abandoned',
  failed: 'Failed',
};
