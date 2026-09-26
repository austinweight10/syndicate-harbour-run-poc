# Epic 07 — Recommendations / fixes

> **Harbour Run SoT (26 Sep 2026):** Primary cards = running frictions (youth size guide, Race Kits shell gap, race/weather copy). Football “Match day / away-kit” samples below are **OPTIONAL secondary** catalogue colour only — not the Saturday pitch.

## Goal (1 paragraph)
Turn Affordance/Insights scores plus event lift SKUs into merchant-facing Recommendation cards (insight fixes, merchandising pins, collection gaps, optional campaign timing copy) with priority P0–P2, provenance badges, confidence context, and deep links into Shopify Admin editors where possible — completing the path from install to actionable recommendation.

## Why it exists
Insights without actions fail the demo close. Recommendations make “what to fix before kick-off” concrete and showable on the **Insights** board (Insights | Frictions).

## Dependencies (other epic IDs)
- **06** for Affordance/Insights (primary).
- **04** for event lift SKUs / collections (merch cards even before agents if needed).
- Soft: **05** for persona attribution on cards.

## Out of scope
- Auto-writing theme liquid or auto-editing products without merchant confirmation.
- Sending marketing email (consent tooling out of MVP) — campaign cards are copy-only suggestions.
- PDF/Notion export (empty state OK — Epic 09).
- Wealth-targeted recommendations.

## User / system stories (Given/When/Then)
1. **Given** insights `sizing` on Kids / Youth Run Tee PDP, **When** recommender runs, **Then** a P0 card “Add a size guide on Youth Run Tee PDPs” appears with SUPPORTED_BY edges to InsightScore + **AgentRun** (PoC: real run id).
2. **Given** wet-weather Driver + waterproof shell under-indexed in Race Kits, **When** merch rules fire, **Then** P1 card “Add waterproof shell to Race Kits (or cross-link Wet-weather training).”
3. **Given** race-weekend baskets include recovery SKUs but collection lacks them, **When** collection rule fires, **Then** card suggests adding recovery products to Race-weekend collection.
4. **Given** merchant opens Insights, **When** page loads, **Then** **Insights** column lists positive affordances and **Frictions** column lists problems with linked fix recommendations.
5. **Given** export brief clicked, **When** MVP, **Then** empty modal “Not wired in this prototype” (honest) rather than fake PDF.

## Data model (tables/fields or TypeScript interfaces)
```ts
model Recommendation {
  id           String @id @default(cuid())
  shopId       String
  kind         String // insight|merch|collection|campaign
  priority     String // P0|P1|P2
  title        String
  body         String // British English
  personaId    String?
  eventId      String?
  runId        String?
  targetType   String? // product|collection|page|theme
  targetRef    String? // GID or path
  adminDeepLink String? // https://admin.shopify.com/store/{store}/products/...
  provenanceLabelsJson String
  confidence   Float?
  status       String @default("open") // open|done|dismissed
  createdAt    DateTime @default(now())
}
```

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **Job:** `recommendations.build(shopId, runId?)` after agent run completes; also `recommendations.fromLift(shopId)` from graph alone.
- **Action:** dismiss/done stubs `POST /app/recommendations/:id` `{ status }` (optional MVP).
- Deep link pattern: `https://admin.shopify.com/store/${shopHandle}/products/${numericId}` (parse GID).

## UI (if any) — screens, components, copy samples British English
- **UI consumers (Epic 08):** Insights | Frictions board loaders read `Recommendation` / Affordance / Insight rows via **Prisma only**. Seed `fixtures/recommendations/demo.json` **into DB**; do not import it in the Insights route. See [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md).
- Refs (layout SoT): `ui/artifacts.html` (Insights | Frictions + fix list).
- P0 sample: “Add kids size guide — Race-day taper abandoned size picker on Youth Run Tee.”
- P1 sample: “Surface Race Kits + wet-weather cross-link on homepage for Saturday race traffic.”
- P2 sample: “Clarify race-day / midweek rain language on race tee and shell PDPs.”
- *(Optional secondary football: “Match day essentials” / away-kit copy — not primary pitch.)*
- Campaign (optional): “Schedule ‘10K taper week’ email Tuesday; exclude recent race-belt buyers.” (note: no send)
- Provenance chips on every card.

## Algorithms / heuristics (formulas, thresholds)
1. Map each InsightScore score≥0.5 → insight Recommendation; priority P0 if score≥0.75 or insightKind in `missing_variant|sizing|price_shock`.
2. Affordance score≥0.7 → Resonates board item (not always a Recommendation; feed Artifacts).
3. Merch rule: if Driver weather wet/cold AND affinity SKUs exist AND homepage collection excludes them → merch card P1.
4. Collection rule: top lift SKUs for Event not in primary collection → collection card P1/P2.
5. Dedupe by `kind+targetRef+title` hash.
6. Cap 10 recommendations per shop for MVP UI.
7. **LLM polish (optional):** only after template cards exist; max ≤1 batch call; on fail/off keep templates; tag MODEL_HYPOTHESIS when used.

## Ethics / provenance labels required
- Every card lists provenance (OBSERVED agent run, MODEL HYPOTHESIS copy, MOCK if from demo replay).
- Campaign suggestions must note “Requires your existing email tool + consent — Syndicate does not send.”
- No recommendations based on inferred wealth.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Read-only Admin deep links (no write_products).
- **Deterministic templates first** (`recommendations.build` must work with LLM off). Optional `ai.recPolish` via `llm.completeOptional` behind env / `SYNDICATE_LLM_PROVIDER` — aggregate non-PII inputs only; polish title/body **after** kind/priority/target are set by rules. Do **not** use LangGraph or LLM to invent recommendations. SoT: `../scope/AI_CALL_CONTRACT.md`.
- SQLite Recommendation table + GraphEdge RECOMMENDS / SUPPORTED_BY.


## Fixture recommendations gate (LOCKED 26 Sep)

`fixtures/recommendations/demo.json` sets `agentRunIdRequired: true` but has **no live runId**. Rules:

| Mode | Allowed? |
|------|----------|
| Seed into Prisma then **link** cards to a real completed/`stopped_before_payment` AgentRun after a real run | **PoC yes** |
| Show cards with visible **MOCK** badge + spoken “fixture / replay” | Emergency/dev only — **not PoC acceptance** |
| Pitch as agent-found with no AgentRun id / no MOCK badge | **FORBIDDEN** |

PoC DoD: agent-attributed Insights **MUST** cite a real `AgentRun` id from **that** session (LIVE_DEMO_GATE).

## Acceptance criteria (checkbox list, testable)
- [ ] After demo agent run, ≥3 Recommendation rows (mix of insight + merch/collection).
- [ ] ≥1 P0 insight card with persona + event linkage.
- [ ] Insights board loader can group Insights (affordance / positive) vs Frictions + fixes **from Prisma** (LIVE_DATA_WIRE).
- [ ] After `db:seed` + `pipeline:demo`, ≥1 Insights/Frictions row visible via Epic 08 without Partner.
- [ ] Deep link present when targetRef is product/collection GID; else null.
- [ ] All cards have provenanceLabelsJson non-empty.
- [ ] Export remains honest empty/not-wired (no fake file).
- [ ] British English titles/bodies.
- [ ] LLM-off / no-key path yields ≥3 template cards; polish never required for AC.
- [ ] If `ai.recPolish` used, provenance includes MODEL_HYPOTHESIS.
- [ ] **Live/demo-live:** no agent-attributed Artifacts cards without matching completed AgentRun; fixture recs only when `mode=demo` fixtures OR explicit MOCK badge.

## Implementation checklist for a coding agent (ordered steps)
1. Add Recommendation model; migrate.
2. Implement insight→card mapper with priority rules.
3. Implement merch/collection lift rules using graph query helper from Epic 04.
4. Implement Admin deep link builder from shop domain + GID.
5. Wire job at end of agent runner + optional post-score hook; implement template mapper **before** any LLM polish flag.
6. Seed `fixtures/recommendations/demo.json` **into SQLite** matching artifacts.html copy for reliable demo (seed script, not route import).
7. Expose `listRecommendations(shopId)`, `listArtifactsBoard(shopId)` — **Epic 08 Insights loader consumers**.
8. Add dismiss action stub (optional).
9. Write unit tests for priority thresholds + dedupe.
10. Cross-link Epic 08 Insights page (`/app/artifacts`) to these loaders.

## Fixtures / seed data required
- Align with prototype Insights board: 3 Insights (positive), 4 Frictions, P0 kids size guide, shipping shock, away copy, kids filters.
- `fixtures/recommendations/demo.json`.

## Test plan
- Unit: priority mapping; deep link parsing from GID.
- Integration: completed AgentRun → recommendations count ≥3.
- Copy review: British English + stop-before-pay mention on agent-sourced cards.



## Gate — Artifacts board vs agent attribution (24 Sep 2026)

**Live / demo-live mode:** the Artifacts board **must not** show agent-attributed Insight / Affordance cards without a matching `AgentRun` in status `completed` for that shop.

| Mode | Allowed recommendation / Insight source |
|------|----------------------------------------|
| `mode=live` or demo-live on Harbour Run | Only cards with `runId` → completed AgentRun; provenance OBSERVED (agent) |
| `mode=demo` fixtures | Fixture recommendations **seeded into DB** OK — same Prisma loaders; UI may indicate demo; **no** route `import demo.json` |
| Emergency | MOCK hydrate OK **only** with explicit **MOCK** badge |

Fixture recommendations from `fixtures/recommendations/demo.json` are **not** speakable as “the agent found” on a live store pitch.

See `../scope/LIVE_DEMO_GATE.md` · `../scope/LIVE_DATA_WIRE.md` · `../scope/DEMO_SCRIPT.md` · `../live-demo-store/`.

## Open questions
1. Include campaign cards in MVP? → **One optional P2**; insight+merch+collection are must.
2. Auto-mark done when merchant clicks deep link? → No; leave open.
3. LLM polish? → Optional `ai.recPolish` only (D32); templates mandatory first — AI_CALL_CONTRACT.
