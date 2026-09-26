export type EvidenceKind = 'observed' | 'aggregate_proxy' | 'model_hypothesis' | 'mock';

export type Archetype = 'match_day' | 'festival' | 'date_night' | 'seasonal_drop' | 'other';

export type EnrichmentSource = 'orders_only' | 'orders_plus_mock';

export type TargetType =
  | 'product'
  | 'collection'
  | 'copy'
  | 'nav'
  | 'filter'
  | 'page'
  | 'checkout'
  | 'sizing'
  | 'search';

export type FrictionKind =
  | 'dead_end'
  | 'missing_variant'
  | 'weak_copy'
  | 'ux_trap'
  | 'price_shock'
  | 'trust';

export type RunOutcome = 'carted' | 'checkout_started' | 'abandoned' | 'failed';

export type Share = {
  label: string;
  share: number;
};

export type Trait = {
  label: string;
  value: string;
  evidence: EvidenceKind;
};

export type ShopFixture = {
  id: string;
  name: string;
  domain: string;
  currency: string;
  timezone: string;
  vertical: string;
  orderCount60d: number;
  aov60d: number;
  syncedAt: string;
};

export type EventRecord = {
  id: string;
  shopId: string;
  name: string;
  archetype: Archetype;
  windowStart: string;
  windowEnd: string;
  geoHint: string;
  orderCount: number;
  aov: number;
  lift: number | null;
  liftNote: string | null;
  dayOfWeek: string;
  topCollections: Share[];
  geoShares: Share[];
  confidence: number;
  enrichmentSource: EnrichmentSource;
  summary: string;
  hypothesis: string;
  mockNote: string | null;
  createdAt: string;
};

export type Persona = {
  id: string;
  shopId: string;
  eventId: string;
  name: string;
  nameEvidence: EvidenceKind;
  summary: string;
  mockNote: string | null;
  goals: string[];
  budgetMin: number;
  budgetMax: number;
  budgetNote: string;
  constraints: Trait[];
  behaviouralTraits: Trait[];
  locationProxy: string;
  locationEvidence: EvidenceKind;
  mockFlags: string[];
  successCriteria: string[];
  createdAt: string;
};

export type AffordanceScore = {
  id: string;
  shopId: string;
  personaId: string;
  runId: string;
  targetType: TargetType;
  targetRef: string;
  targetLabel: string;
  score: number;
  evidence: EvidenceKind;
  notes: string;
};

export type FrictionScore = {
  id: string;
  shopId: string;
  personaId: string;
  runId: string;
  targetType: TargetType;
  targetRef: string;
  targetLabel: string;
  score: number;
  frictionKind: FrictionKind;
  evidence: EvidenceKind;
  notes: string;
};

export type RunStep = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: 'progress' | 'resonate' | 'friction' | 'stop' | 'error';
};

export type CartLine = {
  title: string;
  variant: string;
  price: number;
};

export type CriteriaResult = {
  label: string;
  met: boolean;
};

export type AgentRun = {
  id: string;
  shopId: string;
  personaId: string;
  title: string;
  status: 'completed' | 'failed';
  outcome: RunOutcome;
  startedAt: string;
  endedAt: string;
  viewport: string;
  locale: string;
  summary: string;
  stopNote: string;
  error: string | null;
  steps: RunStep[];
  cart: CartLine[];
  criteria: CriteriaResult[];
};

export type OrderDay = {
  date: string;
  day: number;
  weekday: string;
  orders: number;
  kind: 'match' | 'away' | 'gift' | 'other';
};

export type Recommendation = {
  title: string;
  body: string;
  evidence: EvidenceKind;
};
