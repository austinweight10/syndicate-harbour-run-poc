# Epic 05 — Personas

## Goal (1 paragraph)
Derive 2–3 sports/athleisure shopper personas from **store-backed** EventCandidate baskets and order behaviour (goals, AOV-band budgets, device/time-pressure constraints — never income) as **PipelineRun stage `personas`** after live graph seed — not fixture-only when live ingest succeeded — link them to events via graph edges, and expose Ready/Draft states so merchants can open “Race-day taper” and understand who to simulate before kick-off.

## Why it exists
Personas are the bridge from occasion insight to synthetic shopping. Without them, agents have no goals/budget/constraints and the “watch your store shop itself” pitch fails.

## Dependencies (other epic IDs)
- **04** Graph + confidence (EventCandidates + top SKUs).

## Out of scope
- Fashion vertical depth beyond one greyed stub.
- Wealth / demographic enrichment APIs.
- Lookalike ad audiences.
- Editing personas in a full CMS (MVP read-only + stub).
- Running Playwright (Epic 06).

## User / system stories (Given/When/Then)
1. **Given** a high-confidence race-day event with kit+scarf baskets, **When** persona job runs, **Then** “Race-day taper” (or equivalent) exists with goals including adult shirt + youth run tee, budget £40–£90, mobile-first, Ready status.
2. **Given** search-like first orders / low AOV accessories, **When** derived, **Then** “Wet-weather trainer” Draft persona exists with sizing uncertainty constraint.
3. **Given** fashion stub flag, **When** Personas page loads, **Then** “Anniversary night-out” is visible but greyed/non-interactive (`stub`).
4. **Given** persona detail view, **When** merchant reads brief, **Then** every MOCK/HYPOTHESIS trait is badged.
5. **Given** no events, **When** job runs, **Then** zero personas (empty state) — no hallucinated shoppers.
6. **Given** live PipelineRun after store-backed graph score, **When** stage `personas` runs, **Then** personas are materialised from that shop’s graph (not only demo fixtures) and PipelineRun advances to `agents_queue`.

## Data model (tables/fields or TypeScript interfaces)
```ts
model Persona {
  id              String @id @default(cuid())
  shopId          String
  primaryEventId  String? // EventCandidate id
  name            String
  status          String  // ready|draft|stub
  vertical        String  // sport|athleisure|fashion_stub
  goalsJson       String  // string[]
  budgetMin       Decimal // GBP
  budgetMax       Decimal
  currencyCode    String  @default("GBP")
  constraintsJson String  // { sizes, colours, mobileFirst, timePressure, avoidKidsAisle, deliveryBy }
  behaviouralJson String  // { impulseVsDeliberate, collectionFirstVsSearch }
  locationProxy   String? // "Manchester metro" — not income
  mockFlagsJson   String  // e.g. ["time_pressure_hypothesis"]
  successCriteriaJson String // { minGoalsInCart, reachCheckout }
  avatarInitials  String?
  createdAt       DateTime @default(now())
}

// Graph: PERSONA_OF Persona→EventCandidate; GOALS_INCLUDE Persona→SKU
```

**Seed targets for demo (must match prototype tone):**
| Name | Status | Goals | Budget | Constraints |
|------|--------|-------|--------|-------------|
| Race-day taper | ready | Home/away shirt; youth run tee | £40–£90 | Adult L; mobile; time-pressured pre-kick-off |
| Wet-weather trainer | ready (or draft OK) | “Find a kit”; unclear size | £30–£70 | Search-first; sizing help needed — second full persona (A6) |
| Anniversary night-out | stub | — | — | Fashion stub — non-interactive |
| ~~Optional 3rd sport~~ | stretch only | Taper-week runner — **NOT required for DoD (A6)** | £50–£120 | Athleisure layering — implement only if time |

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **Job:** `personas.derive(shopId)` — PipelineRun stage `personas` (auto after `score_link`) + Settings recompute.
- Inputs: top EventCandidates, top line items per event, AOV percentiles.
- Output: upsert Personas by `shopId+name` natural key.
- Loader: `GET` via Remix `/app/personas`, `/app/personas/:id`.

## UI (if any) — screens, components, copy samples British English
- Refs: `ui/personas.html`, `ui/persona-detail.html`.
- Card copy Race-day taper: “Shirt + youth run tee · £40–£90 · mobile”.
- Detail brief: “Shops on mobile in the 90 minutes before kick-off. Wants adult L race tee and a youth run tee under £25. Time-pressured — will abandon if size guide is buried.”
- Labels modal traits: time pressure = MODEL HYPOTHESIS; budget from AOV bands = OBSERVED aggregate; device mix = OBSERVED if sourceName/userAgent proxy else HYPOTHESIS.
- Stub ribbon: “Fashion vertical — parked for this demo”.

## Algorithms / heuristics (formulas, thresholds)
1. Take top 2 EventCandidates by confidence with nOrders ≥ 5 (or allow 1 low-n as Draft).
2. **Goals:** top 2–3 product types/titles in event cohort baskets (dedupe).
3. **Budget:** 25th–75th percentile of order subtotals in cohort (not income); round to £10.
4. **Mobile-first:** if ≥60% orders `sourceName` web + heuristic; else default mobile for race-day dad (flag HYPOTHESIS).
5. **Time pressure:** true for team_fixture events within 3h of startAt (HYPOTHESIS).
6. **Status:** Ready if goals≥2 and budget band width ≤ £80; else Draft.
7. Always insert fashion stub once per shop for UI honesty.

## Ethics / provenance labels required
- `mockFlagsJson` / UI badges for every non-order trait.
- Budget = **AOV band from orders** (OBSERVED aggregate) — copy must never say “income” or “affluent”.
- No names/emails of real customers in persona labels.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Derivation in TypeScript; **naming/blurb LLM optional** (`ai.personaBlurb` / event names via graph job) — **templates first**; see `../scope/AI_CALL_CONTRACT.md`. Never send PII; LLM output → MODEL_HYPOTHESIS.
- SQLite Persona table + GraphEdges.
- Personas feed Epic 06 successCriteria.

## Acceptance criteria (checkbox list, testable)
- [ ] ≥2 non-stub personas created on demo fixtures.
- [ ] Away-day-dad-equivalent has budgetMin/Max, goalsJson≥2, primaryEventId set.
- [ ] Fashion stub present with status `stub`.
- [ ] PERSONA_OF edge exists for each non-stub persona.
- [ ] Persona detail loader returns constraints + mockFlags for badges.
- [ ] No persona field implies wealth/SES.
- [ ] British English names/descriptions.
- [ ] Live connect: personas derived from store-backed graph after PipelineRun stage `score_link` — not fixture-only when live ingest succeeded.
- [ ] PipelineRun stage `personas` status updated; Ready personas feed stage `agents_queue`.
- [ ] With `SYNDICATE_LLM_PROVIDER=off`, personas still derive with template blurbs; no provider HTTP.
- [ ] If LLM blurb used, field provenance / mockFlags includes MODEL_HYPOTHESIS (Hyp).

## Implementation checklist for a coding agent (ordered steps)
1. Add Persona model; migrate.
2. Implement AOV percentile helper on event cohort orders.
3. Implement goal extraction from top line items / productTypes.
4. Implement `personas.derive` status rules + fashion stub insert.
5. Write GraphEdges PERSONA_OF and GOALS_INCLUDE.
6. Blurb writer: **en-GB template strings first** (required); optional `llm.completeOptional('ai.personaBlurb', …)` only if key + under cap (AI_CALL_CONTRACT).
7. Seed override JSON `fixtures/personas/demo.json` matching HTML prototype exactly for reliable demo.
8. Wire service as PipelineRun stage `personas` after `graph.buildAndScore` / `score_link` (auto on live).
9. Unit-test budget bands and stub insertion.
10. Export `listPersonas`, `getPersona` for UI/agents.

## Fixtures / seed data required
- `fixtures/personas/demo.json` aligned with `ui/persona-detail.html` (Race-day taper).
- Ensure Epic 02 fixtures contain youth run tee + shirt lines for goal extraction.

## Test plan
- Golden seed: derive → assert names/status/budget ranges.
- Ethics lint: fail if persona JSON contains words `income|wealth|affluent|IMD`.
- Manual: Personas page shows Ready + Draft + stub.

## Open questions
1. Third persona runner vs studio athleisure? → **LOCKED A6 (24 Sep 2026): two full personas + fashion stub.** Taper-week runner is optional stretch only — not DoD.
2. Allow merchant edit? → Not in MVP; read-only.
3. LLM for naming/blurb? → **Optional only** (A8/D32); weekend default templates; see AI_CALL_CONTRACT.
