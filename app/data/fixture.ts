import type {
  AffordanceScore,
  AgentRun,
  EventRecord,
  FrictionScore,
  OrderDay,
  Persona,
  Recommendation,
  ShopFixture,
} from './types.ts';

const shopId = 'harbour-athletic.myshopify.com';

export const shop: ShopFixture = {
  id: shopId,
  name: 'Harbour Athletic',
  domain: 'harbour-athletic.myshopify.com',
  currency: 'GBP',
  timezone: 'Europe/London',
  vertical: 'Football fanwear',
  orderCount60d: 310,
  aov60d: 44.1,
  syncedAt: '2026-09-22T07:55:00+01:00',
};

export const orderDays: OrderDay[] = [
  { date: '2026-09-07', day: 7, weekday: 'Mon', orders: 8, kind: 'other' },
  { date: '2026-09-08', day: 8, weekday: 'Tue', orders: 6, kind: 'other' },
  { date: '2026-09-09', day: 9, weekday: 'Wed', orders: 9, kind: 'other' },
  { date: '2026-09-10', day: 10, weekday: 'Thu', orders: 7, kind: 'other' },
  { date: '2026-09-11', day: 11, weekday: 'Fri', orders: 14, kind: 'away' },
  { date: '2026-09-12', day: 12, weekday: 'Sat', orders: 16, kind: 'away' },
  { date: '2026-09-13', day: 13, weekday: 'Sun', orders: 11, kind: 'away' },
  { date: '2026-09-14', day: 14, weekday: 'Mon', orders: 6, kind: 'other' },
  { date: '2026-09-15', day: 15, weekday: 'Tue', orders: 5, kind: 'other' },
  { date: '2026-09-16', day: 16, weekday: 'Wed', orders: 9, kind: 'gift' },
  { date: '2026-09-17', day: 17, weekday: 'Thu', orders: 11, kind: 'gift' },
  { date: '2026-09-18', day: 18, weekday: 'Fri', orders: 13, kind: 'gift' },
  { date: '2026-09-19', day: 19, weekday: 'Sat', orders: 86, kind: 'match' },
  { date: '2026-09-20', day: 20, weekday: 'Sun', orders: 14, kind: 'other' },
];

export const events: EventRecord[] = [
  {
    id: 'evt_match_day_home',
    shopId,
    name: 'Match-day home kit rush',
    archetype: 'match_day',
    windowStart: '2026-09-19T08:40:00+01:00',
    windowEnd: '2026-09-19T22:15:00+01:00',
    geoHint: 'Bristol',
    orderCount: 86,
    aov: 61.4,
    lift: 3.4,
    liftNote: 'Median Saturday outside this spike and the away weekend: 25 orders.',
    dayOfWeek: 'Saturday',
    topCollections: [
      { label: 'Home kits', share: 0.48 },
      { label: 'Scarves & hats', share: 0.22 },
      { label: 'Match day essentials', share: 0.14 },
      { label: 'Training', share: 0.09 },
      { label: 'Other', share: 0.07 },
    ],
    geoShares: [
      { label: 'Bristol', share: 0.71 },
      { label: 'South Gloucestershire', share: 0.14 },
      { label: 'Other UK', share: 0.15 },
    ],
    confidence: 0.84,
    enrichmentSource: 'orders_only',
    summary:
      'Saturday 19 Sept was not a normal trading day. 86 orders landed between 08:40 and 22:15 UK time, 3.4× the median Saturday outside this spike. Baskets clustered on the 2026/27 home shirt in adult sizes, often with a scarf.',
    hypothesis:
      'Calendar join: Harbour Athletic vs Kingswood Rovers at home, kick-off 15:00 on Saturday 19 Sept. The name “Match-day home kit rush” was written for merchants from the basket mix and the date. It is not a label stored on the orders.',
    mockNote:
      'English IMD decile band 4–6 for Bristol postcode sectors BS1–BS8. This figure is invented for the demo. Syndicate has not joined an indices-of-deprivation file, and a decile is not a property of any buyer.',
    createdAt: '2026-09-22T07:58:00+01:00',
  },
  {
    id: 'evt_away_travel',
    shopId,
    name: 'Away travel weekend',
    archetype: 'match_day',
    windowStart: '2026-09-11T00:00:00+01:00',
    windowEnd: '2026-09-13T23:59:00+01:00',
    geoHint: 'Leeds, York, Manchester, Bristol',
    orderCount: 34,
    aov: 48.2,
    lift: 1.6,
    liftNote: 'Compared with the median Friday-to-Sunday window in the rest of the fixture.',
    dayOfWeek: 'Friday to Sunday',
    topCollections: [
      { label: 'Away kits', share: 0.61 },
      { label: 'Scarves & hats', share: 0.24 },
      { label: 'Travel', share: 0.15 },
    ],
    geoShares: [
      { label: 'Leeds', share: 0.34 },
      { label: 'Bristol', share: 0.22 },
      { label: 'York', share: 0.18 },
      { label: 'Manchester', share: 0.15 },
      { label: 'Other UK', share: 0.11 },
    ],
    confidence: 0.71,
    enrichmentSource: 'orders_only',
    summary:
      '34 orders from Friday 11 to Sunday 13 Sept paired the navy and copper away shirt with a scarf or a beanie. Average order value was £48.20, quieter than the home-kit rush. Shipping cities were more spread out than on the Saturday spike.',
    hypothesis:
      'Calendar join: Harbour Athletic away at Ridings Town, Leeds, kick-off 15:00 on Saturday 12 Sept. The Bristol share may be home supporters buying before they travelled. That reading is a hypothesis, not a delivery address.',
    mockNote: null,
    createdAt: '2026-09-22T07:58:00+01:00',
  },
  {
    id: 'evt_gift_match',
    shopId,
    name: 'Gift for the match',
    archetype: 'other',
    windowStart: '2026-09-16T00:00:00+01:00',
    windowEnd: '2026-09-18T23:59:00+01:00',
    geoHint: 'No single city',
    orderCount: 29,
    aov: 27.8,
    lift: null,
    liftNote: null,
    dayOfWeek: 'Wednesday to Friday',
    topCollections: [
      { label: 'Gifts', share: 0.54 },
      { label: 'Scarves & hats', share: 0.31 },
      { label: 'Home kits', share: 0.15 },
    ],
    geoShares: [
      { label: 'England', share: 0.78 },
      { label: 'Wales', share: 0.09 },
      { label: 'Scotland', share: 0.08 },
      { label: 'Northern Ireland', share: 0.05 },
    ],
    confidence: 0.63,
    enrichmentSource: 'orders_only',
    summary:
      '29 mid-week orders sat well below the kit rushes, at £27.80 on average. Mugs, prints, and scarves led. 11 orders carried a short note such as “for Saturday” or “happy birthday”. No street addresses are stored.',
    hypothesis:
      'The name “Gift for the match” groups those notes, the lower spend, and the Wednesday-to-Friday timing as one occasion ahead of the home fixture. The notes are observed. The grouping is a hypothesis.',
    mockNote: null,
    createdAt: '2026-09-22T07:58:00+01:00',
  },
];

export const personas: Persona[] = [
  {
    id: 'per_away_day_dad',
    shopId,
    eventId: 'evt_away_travel',
    name: 'Away-day dad',
    nameEvidence: 'mock',
    summary:
      'The observed pattern is a basket: an adult L away shirt and a scarf, placed in the away-travel window, with the total sitting between £40 and £80. The agent replays that job on a phone and stops before payment.',
    mockNote:
      'Away-day dad is a shorthand for the demo. It is not an identity, a household, or an income. Orders do not say who the buyer lives with.',
    goals: [
      'Find the 2026/27 away shirt in adult L',
      'Add a scarf under £25',
      'Keep the basket between £40 and £80',
    ],
    budgetMin: 40,
    budgetMax: 80,
    budgetNote: 'Middle half of basket totals in this cluster.',
    constraints: [
      {
        label: 'Size',
        value: 'Adult L is the most common away-shirt variant in the cluster.',
        evidence: 'observed',
      },
      {
        label: 'Colourway',
        value: 'Navy and copper, the only away shirt in these orders.',
        evidence: 'observed',
      },
      {
        label: 'Budget',
        value: '£40 to £80, from the middle half of basket totals.',
        evidence: 'observed',
      },
      {
        label: 'Scarf cap',
        value: 'Under £25, set just above the £18 bar scarf that actually sold.',
        evidence: 'model_hypothesis',
      },
      {
        label: 'Device',
        value: 'Mobile viewport. There is no browse pixel, so this is how the agent is briefed.',
        evidence: 'model_hypothesis',
      },
      {
        label: 'Aisle',
        value: 'Skip children’s products. The cluster is adult sizes only.',
        evidence: 'model_hypothesis',
      },
    ],
    behaviouralTraits: [
      {
        label: 'Basket shape',
        value: 'Away shirt paired with a scarf or a beanie, not a single item.',
        evidence: 'observed',
      },
      {
        label: 'Pace',
        value: 'The agent is told to search for the scarf, then fall back to collections.',
        evidence: 'model_hypothesis',
      },
    ],
    locationProxy:
      'Shipping cities in this cluster: Leeds, York, Manchester, and a Bristol share. Not a home address.',
    locationEvidence: 'aggregate_proxy',
    mockFlags: ['demographic_proxy_mock'],
    successCriteria: [
      'Away shirt in adult L is in the basket',
      'A scarf under £25 is in the basket',
      'Basket total is inside £40 to £80',
      'Checkout has started',
    ],
    createdAt: '2026-09-22T07:59:00+01:00',
  },
  {
    id: 'per_match_day_regular',
    shopId,
    eventId: 'evt_match_day_home',
    name: 'Match-day regular',
    nameEvidence: 'model_hypothesis',
    summary:
      'Adult home shirts on Saturday 19 Sept, often size M or L, with a higher basket than the away weekend. The name describes the occasion, not a person we can identify.',
    mockNote: null,
    goals: [
      'Find the 2026/27 home shirt in an adult size',
      'Check the size guide before adding it',
      'Add a name print if it is easy to find',
    ],
    budgetMin: 55,
    budgetMax: 95,
    budgetNote: 'Middle half of home-kit baskets on 19 Sept.',
    constraints: [
      {
        label: 'Size',
        value: 'Adult M and L account for most home-shirt units that day.',
        evidence: 'observed',
      },
      {
        label: 'Budget',
        value: '£55 to £95, from the middle half of those baskets.',
        evidence: 'observed',
      },
      {
        label: 'Timing',
        value: 'Before the 15:00 kick-off the calendar join suggests.',
        evidence: 'model_hypothesis',
      },
    ],
    behaviouralTraits: [
      {
        label: 'Collection first',
        value: 'The agent opens Home kits from the nav rather than search.',
        evidence: 'model_hypothesis',
      },
      {
        label: 'Add-on',
        value: 'About one in five of these baskets also had a scarf.',
        evidence: 'observed',
      },
    ],
    locationProxy: 'Bristol and nearby South Gloucestershire shipping shares. Not a street.',
    locationEvidence: 'aggregate_proxy',
    mockFlags: [],
    successCriteria: [
      'Home shirt in an adult size is in the basket',
      'Size guide was opened',
      'Name print was added',
      'Checkout has started',
    ],
    createdAt: '2026-09-22T07:59:00+01:00',
  },
  {
    id: 'per_gift_sender',
    shopId,
    eventId: 'evt_gift_match',
    name: 'Saturday gift sender',
    nameEvidence: 'model_hypothesis',
    summary:
      'Smaller mid-week baskets and a handful of gift notes. The agent looks for a scarf or a mug under £30 and a place to leave a note.',
    mockNote: null,
    goals: ['Find a scarf or a mug under £30', 'Leave a short gift note', 'Stay within a small budget'],
    budgetMin: 15,
    budgetMax: 35,
    budgetNote: 'Middle half of the mid-week gift-like baskets.',
    constraints: [
      {
        label: 'Budget',
        value: '£15 to £35. The crest mug is £14 and the bar scarf is £18.',
        evidence: 'observed',
      },
      {
        label: 'Notes',
        value: '11 orders used a short note. No names from those notes are stored.',
        evidence: 'observed',
      },
      {
        label: 'Size',
        value: 'No size is required. The agent should not enter the shirt builder.',
        evidence: 'model_hypothesis',
      },
    ],
    behaviouralTraits: [
      {
        label: 'Search',
        value: 'The agent searches “scarf” first, because that word is in the goal.',
        evidence: 'model_hypothesis',
      },
    ],
    locationProxy: 'Country shares only. No city concentration strong enough to name.',
    locationEvidence: 'aggregate_proxy',
    mockFlags: [],
    successCriteria: [
      'A scarf or mug under £30 is in the basket',
      'A gift note was entered',
      'Checkout has started',
    ],
    createdAt: '2026-09-22T07:59:00+01:00',
  },
];

export const affordances: AffordanceScore[] = [
  {
    id: 'aff_away_kits',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'collection',
    targetRef: '/collections/away-kits',
    targetLabel: 'Away kits collection',
    score: 0.91,
    evidence: 'observed',
    notes: 'Opened from Shop by kit in one step. The collection held the away shirt the goal asked for.',
  },
  {
    id: 'aff_away_shirt',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'product',
    targetRef: 'gid://shopify/Product/away-shirt-2627',
    targetLabel: '2026/27 Away shirt',
    score: 0.88,
    evidence: 'observed',
    notes: 'Adult L was in stock at £55, inside the budget. Added to the basket on the first attempt.',
  },
  {
    id: 'aff_bar_scarf',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'product',
    targetRef: 'gid://shopify/Product/bar-scarf',
    targetLabel: 'Bar scarf',
    score: 0.73,
    evidence: 'observed',
    notes: 'Found from Scarves & hats at £18 after search missed it. Under the £25 cap.',
  },
  {
    id: 'aff_travel_copy',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'copy',
    targetRef: '/collections/away-kits#intro',
    targetLabel: '“Travelling support” intro',
    score: 0.7,
    evidence: 'observed',
    notes: 'The first line on Away kits names travel, which matches the goal.',
  },
  {
    id: 'aff_checkout',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'checkout',
    targetRef: '/checkout',
    targetLabel: 'Checkout contact step',
    score: 0.64,
    evidence: 'observed',
    notes: 'The contact step loaded. The agent stopped there, before any payment field was used.',
  },
  {
    id: 'aff_home_kits',
    shopId,
    personaId: 'per_match_day_regular',
    runId: 'run_match_regular',
    targetType: 'collection',
    targetRef: '/collections/home-kits',
    targetLabel: 'Home kits collection',
    score: 0.9,
    evidence: 'observed',
    notes: 'The home shirt was on the first screen of Home kits. No search was required.',
  },
  {
    id: 'aff_home_shirt',
    shopId,
    personaId: 'per_match_day_regular',
    runId: 'run_match_regular',
    targetType: 'product',
    targetRef: 'gid://shopify/Product/home-shirt-2627',
    targetLabel: '2026/27 Home shirt',
    score: 0.82,
    evidence: 'observed',
    notes: 'Adult M was in stock at £60. Added to the basket once the size guide had been found.',
  },
  {
    id: 'aff_gifts_nav',
    shopId,
    personaId: 'per_gift_sender',
    runId: 'run_gift_sender',
    targetType: 'nav',
    targetRef: '/collections/gifts',
    targetLabel: 'Gifts in the navigation',
    score: 0.58,
    evidence: 'observed',
    notes: 'The Gifts label is clear. The run still searched first and did not open it in time.',
  },
];

export const frictions: FrictionScore[] = [
  {
    id: 'fri_size_guide_away',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'sizing',
    targetRef: 'gid://shopify/Product/away-shirt-2627#size-guide',
    targetLabel: 'Size guide on the away shirt',
    score: 0.84,
    frictionKind: 'ux_trap',
    evidence: 'observed',
    notes: 'The size guide sits below the reviews. The agent scrolled twice before confirming adult L.',
  },
  {
    id: 'fri_search_scarf',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'search',
    targetRef: '/search?q=scarf',
    targetLabel: 'Search results for “scarf”',
    score: 0.79,
    frictionKind: 'dead_end',
    evidence: 'observed',
    notes: 'The crest mug, the stadium print, and the beanie ranked above scarves. The bar scarf was not on the first screen.',
  },
  {
    id: 'fri_home_page',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'page',
    targetRef: '/',
    targetLabel: 'Home page',
    score: 0.66,
    frictionKind: 'weak_copy',
    evidence: 'observed',
    notes: 'The H1 was “New season”. There was no match-day or away-day block, and Match day essentials was not linked.',
  },
  {
    id: 'fri_cross_sell',
    shopId,
    personaId: 'per_away_day_dad',
    runId: 'run_away_dad',
    targetType: 'product',
    targetRef: 'gid://shopify/Product/away-shirt-2627#cross-sell',
    targetLabel: 'Scarf offer on the shirt page',
    score: 0.61,
    frictionKind: 'ux_trap',
    evidence: 'observed',
    notes: 'After the shirt was added, the product page did not offer a scarf. The agent had to leave.',
  },
  {
    id: 'fri_size_guide_home',
    shopId,
    personaId: 'per_match_day_regular',
    runId: 'run_match_regular',
    targetType: 'sizing',
    targetRef: 'gid://shopify/Product/home-shirt-2627#size-guide',
    targetLabel: 'Size guide on the home shirt',
    score: 0.72,
    frictionKind: 'ux_trap',
    evidence: 'observed',
    notes: 'Same pattern as the away shirt: the guide is below the reviews. The run found it, then stopped in the basket.',
  },
  {
    id: 'fri_name_print',
    shopId,
    personaId: 'per_match_day_regular',
    runId: 'run_match_regular',
    targetType: 'page',
    targetRef: '/pages/name-print',
    targetLabel: 'Name print',
    score: 0.58,
    frictionKind: 'ux_trap',
    evidence: 'observed',
    notes: 'Name print is a separate page linked under the fold. The agent did not add one.',
  },
  {
    id: 'fri_gift_search',
    shopId,
    personaId: 'per_gift_sender',
    runId: 'run_gift_sender',
    targetType: 'search',
    targetRef: '/search?q=scarf',
    targetLabel: 'Search results for “scarf”',
    score: 0.88,
    frictionKind: 'dead_end',
    evidence: 'observed',
    notes: 'The gift run searched “scarf”, saw the crest mug first, and left without a basket.',
  },
  {
    id: 'fri_gift_note',
    shopId,
    personaId: 'per_gift_sender',
    runId: 'run_gift_sender',
    targetType: 'product',
    targetRef: 'gid://shopify/Product/crest-mug',
    targetLabel: 'Gift note on the mug',
    score: 0.57,
    frictionKind: 'weak_copy',
    evidence: 'observed',
    notes: 'The mug page has no gift-note field. Notes on past orders were added at checkout, which this run never reached.',
  },
];

export const recommendations: Record<string, Recommendation> = {
  all: {
    title: 'Surface Match day essentials on the home page for Saturday traffic',
    body: 'On 19 Sept, 86 orders spiked on home kits while the homepage still led with “New season”. The missing block is what the agent saw. Betting that Saturday traffic needs it is a hypothesis.',
    evidence: 'model_hypothesis',
  },
  per_away_day_dad: {
    title: 'Put the bar scarf on the away shirt page',
    body: 'The agent added the £55 shirt, then had to leave the product page to find the £18 scarf. Search for “scarf” ranked a mug first.',
    evidence: 'observed',
  },
  per_match_day_regular: {
    title: 'Move the size guide above the reviews',
    body: 'The home shirt was in stock in adult M, but the guide sat below the reviews. The run stopped in the basket and did not start checkout.',
    evidence: 'observed',
  },
  per_gift_sender: {
    title: 'Rank scarves above mugs for the query “scarf”',
    body: 'The gift run searched “scarf”, saw the crest mug first, and left without a basket. A gift-note field was not on the mug page either.',
    evidence: 'observed',
  },
};

export const runs: AgentRun[] = [
  {
    id: 'run_away_dad',
    shopId,
    personaId: 'per_away_day_dad',
    title: 'Morning replay',
    status: 'completed',
    outcome: 'checkout_started',
    startedAt: '2026-09-22T08:14:00+01:00',
    endedAt: '2026-09-22T08:17:00+01:00',
    viewport: 'Mobile, 390 × 844',
    locale: 'en-GB',
    summary:
      'The away-day brief reached checkout with the away shirt in adult L and the £18 bar scarf. Basket £73, inside the band. No payment was taken.',
    stopNote: 'Stopped on the checkout contact step. No payment was taken and no order was created.',
    error: null,
    cart: [
      { title: '2026/27 Away shirt', variant: 'Adult L · Navy / copper', price: 55 },
      { title: 'Bar scarf', variant: 'One size · Harbour green', price: 18 },
    ],
    criteria: [
      { label: 'Away shirt in adult L is in the basket', met: true },
      { label: 'A scarf under £25 is in the basket', met: true },
      { label: 'Basket total is inside £40 to £80', met: true },
      { label: 'Checkout has started', met: true },
    ],
    steps: [
      {
        id: 's1',
        at: '2026-09-22T08:14:06+01:00',
        title: 'Opened the home page',
        detail: 'H1 read “New season”. No match-day block and no link to Match day essentials.',
        tone: 'friction',
      },
      {
        id: 's2',
        at: '2026-09-22T08:14:28+01:00',
        title: 'Opened Away kits',
        detail: 'Shop by kit, then Away kits. Intro line: “Travelling support”. The away shirt was on the first screen.',
        tone: 'resonate',
      },
      {
        id: 's3',
        at: '2026-09-22T08:15:02+01:00',
        title: 'Searched “scarf”',
        detail: 'First screen: crest mug, stadium print, travel beanie. The bar scarf was not visible.',
        tone: 'friction',
      },
      {
        id: 's4',
        at: '2026-09-22T08:15:31+01:00',
        title: 'Opened Scarves & hats',
        detail: 'Bar scarf, £18. That meets the under-£25 goal. Noted for later, then back to the shirt.',
        tone: 'resonate',
      },
      {
        id: 's5',
        at: '2026-09-22T08:15:55+01:00',
        title: 'Opened the away shirt',
        detail: '£55, navy and copper. Adult L in stock. Agent timer on the page: 38 seconds before add to basket.',
        tone: 'progress',
      },
      {
        id: 's6',
        at: '2026-09-22T08:16:20+01:00',
        title: 'Hunted for the size guide',
        detail: 'Two scrolls, past reviews, before the guide confirmed adult L.',
        tone: 'friction',
      },
      {
        id: 's7',
        at: '2026-09-22T08:16:40+01:00',
        title: 'Added the shirt, then the scarf',
        detail: 'No scarf offer on the shirt page. Left for Scarves & hats and added the bar scarf. Basket £73.',
        tone: 'friction',
      },
      {
        id: 's8',
        at: '2026-09-22T08:17:18+01:00',
        title: 'Started checkout, then stopped',
        detail: 'Contact step visible. Runner stopped by policy. No payment field was completed.',
        tone: 'stop',
      },
    ],
  },
  {
    id: 'run_away_timeout',
    shopId,
    personaId: 'per_away_day_dad',
    title: 'Storefront timeout',
    status: 'failed',
    outcome: 'failed',
    startedAt: '2026-09-21T16:40:00+01:00',
    endedAt: '2026-09-21T16:41:00+01:00',
    viewport: 'Mobile, 390 × 844',
    locale: 'en-GB',
    summary: 'Yesterday’s replay opened the home page, then the request to Away kits did not return.',
    stopNote: 'The runner stopped on a timeout. No basket was created and no payment was attempted.',
    error: 'Storefront navigation timed out after the home page. Away kits did not load within 20 seconds.',
    cart: [],
    criteria: [
      { label: 'Away shirt in adult L is in the basket', met: false },
      { label: 'A scarf under £25 is in the basket', met: false },
      { label: 'Basket total is inside £40 to £80', met: false },
      { label: 'Checkout has started', met: false },
    ],
    steps: [
      {
        id: 'f1',
        at: '2026-09-21T16:40:12+01:00',
        title: 'Opened the home page',
        detail: 'Home page loaded. H1 “New season”.',
        tone: 'progress',
      },
      {
        id: 'f2',
        at: '2026-09-21T16:40:40+01:00',
        title: 'Away kits timed out',
        detail: 'The navigation request did not return within 20 seconds.',
        tone: 'error',
      },
      {
        id: 'f3',
        at: '2026-09-21T16:41:02+01:00',
        title: 'Runner stopped',
        detail: 'No retry was issued in this fixture. The completed replay is the next morning.',
        tone: 'stop',
      },
    ],
  },
  {
    id: 'run_match_regular',
    shopId,
    personaId: 'per_match_day_regular',
    title: 'Saturday basket',
    status: 'completed',
    outcome: 'carted',
    startedAt: '2026-09-19T09:05:00+01:00',
    endedAt: '2026-09-19T09:09:00+01:00',
    viewport: 'Mobile, 390 × 844',
    locale: 'en-GB',
    summary:
      'Home kits were easy to find. Adult M was in stock. The size guide was buried, the name print was a separate page, and the run stopped in the basket.',
    stopNote: 'Stopped in the basket. Checkout was not opened. No payment was taken.',
    error: null,
    cart: [{ title: '2026/27 Home shirt', variant: 'Adult M · Green / cream', price: 60 }],
    criteria: [
      { label: 'Home shirt in an adult size is in the basket', met: true },
      { label: 'Size guide was opened', met: true },
      { label: 'Name print was added', met: false },
      { label: 'Checkout has started', met: false },
    ],
    steps: [
      {
        id: 'm1',
        at: '2026-09-19T09:05:20+01:00',
        title: 'Opened Home kits',
        detail: 'From Shop by kit. The 2026/27 home shirt was the first product.',
        tone: 'resonate',
      },
      {
        id: 'm2',
        at: '2026-09-19T09:06:10+01:00',
        title: 'Found the size guide under the reviews',
        detail: 'Adult M matched the brief. The guide took two scrolls.',
        tone: 'friction',
      },
      {
        id: 'm3',
        at: '2026-09-19T09:07:02+01:00',
        title: 'Missed the name print',
        detail: 'Name print lives on its own page, linked below the fold. The agent did not open it.',
        tone: 'friction',
      },
      {
        id: 'm4',
        at: '2026-09-19T09:08:40+01:00',
        title: 'Added the shirt and stopped',
        detail: 'Basket £60, inside £55 to £95. Checkout was not started.',
        tone: 'stop',
      },
    ],
  },
  {
    id: 'run_gift_sender',
    shopId,
    personaId: 'per_gift_sender',
    title: 'Scarf search',
    status: 'completed',
    outcome: 'abandoned',
    startedAt: '2026-09-18T13:22:00+01:00',
    endedAt: '2026-09-18T13:26:00+01:00',
    viewport: 'Mobile, 390 × 844',
    locale: 'en-GB',
    summary: 'Search for “scarf” led with the crest mug. The run left without adding anything.',
    stopNote: 'Abandoned on search. No basket and no payment.',
    error: null,
    cart: [],
    criteria: [
      { label: 'A scarf or mug under £30 is in the basket', met: false },
      { label: 'A gift note was entered', met: false },
      { label: 'Checkout has started', met: false },
    ],
    steps: [
      {
        id: 'g1',
        at: '2026-09-18T13:22:18+01:00',
        title: 'Landed on the home page',
        detail: 'No gift or scarf module on the first screen.',
        tone: 'progress',
      },
      {
        id: 'g2',
        at: '2026-09-18T13:23:05+01:00',
        title: 'Searched “scarf”',
        detail: 'Crest mug first, then the stadium print. The bar scarf was not on the first screen.',
        tone: 'friction',
      },
      {
        id: 'g3',
        at: '2026-09-18T13:24:40+01:00',
        title: 'Opened the mug, found no gift note',
        detail: 'The mug is £14, inside budget, but there is no note field on the product page.',
        tone: 'friction',
      },
      {
        id: 'g4',
        at: '2026-09-18T13:25:50+01:00',
        title: 'Left the site',
        detail: 'Nothing was added. Gifts in the nav was never opened.',
        tone: 'stop',
      },
    ],
  },
];

export function getEvent(id: string) {
  return events.find((event) => event.id === id);
}

export function getPersona(id: string) {
  return personas.find((persona) => persona.id === id);
}

export function getRun(id: string) {
  return runs.find((run) => run.id === id);
}

export function personasForEvent(eventId: string) {
  return personas.filter((persona) => persona.eventId === eventId);
}

export function runsForPersona(personaId: string) {
  return runs
    .filter((run) => run.personaId === personaId)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function runsNewestFirst() {
  return [...runs].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export function affordancesFor(personaId: string) {
  const rows = personaId === 'all' ? affordances : affordances.filter((row) => row.personaId === personaId);
  return [...rows].sort((a, b) => b.score - a.score);
}

export function frictionsFor(personaId: string) {
  const rows = personaId === 'all' ? frictions : frictions.filter((row) => row.personaId === personaId);
  return [...rows].sort((a, b) => b.score - a.score);
}

export function scoresForRun(runId: string) {
  return {
    affordances: affordances.filter((row) => row.runId === runId),
    frictions: frictions.filter((row) => row.runId === runId),
  };
}
