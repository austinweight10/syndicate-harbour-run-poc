# Epic 06 — Synthetic agents (Playwright shoppers)

## Goal (1 paragraph)
Run 2–3 Playwright persona sessions against the merchant Online Store that follow persona goals/constraints (home → collection → PDP → variant → ATC → checkout start), stop before any payment, **auto-queue (capped) as PipelineRun stage `agents_queue` after personas materialise** when `ShopSettings.agentsAutoRun` is true (D26) — clear named trigger, not mysterious background chaos — and persist AffordanceScore / InsightScore / AgentRun timelines so Artifacts and Agent runs screens can show “Carted · checkout started” with resonates vs insights evidence.


## Locks (26 Sep 2026) — PoC real runtime

| Lock | Rule |
|------|------|
| **Path SoT** | `fixtures/agents/path-harbour-run-dawn.json` only for weekend primary. `path-football-merch.json` + `path-harbour-athletic-dawn.json` = **SUPERSEDED**. |
| **Deny-list SoT** | Enumerated in `scope/CONTRACTS.md` § Agent deny-list — implement that list; path JSON `denyList` ⊆ SoT. |
| **Storefront URL** | `SHOP_STOREFRONT_URL` env **overrides** `Shop.storefrontUrl`; missing → **B06**, no silent no-op (LIVE_DEMO_GATE). |
| **Worker** | In-process job runner on app server **OK** for weekend; must drain `queued` → terminal; no pending-forever (CONTRACTS §2c). |
| **PoC happy path** | Real headed Playwright → real `AgentRun` → Insights cite **that** run id. `demo-completed-run.json` = **emergency/dev only**, never PoC acceptance. |
| **POST body** | See thickened `CreateRunsActionInput` / `TimelineStep` in CONTRACTS §5.5 + RUN_AGENTS_UI_CONTRACT. |

## Run agents UI contract (**mandatory**)

Admin **Run agents** must create real Prisma `AgentRun` rows and spawn Playwright shoppers per [`../scope/RUN_AGENTS_UI_CONTRACT.md`](../scope/RUN_AGENTS_UI_CONTRACT.md).

**Forbidden theatre:** Vite `localStorage` / `sessionStorage` fake progress; toast-only “queued” with no runner; MCP `TodoWrite` as shopper runtime; Cursor Cloud Agents executing merchant runs (D28 = **build only**). Graph is **not** recomputed by agents — write `AgentRun` + AffordanceScore/InsightScore only.

## Why it exists
Live synthetic shoppers are Syndicate’s wedge vs enrichment-only apps: prove whether the storefront is ready for the people who buy on match/race weekend.

## Dependencies (other epic IDs)
- **05** Personas (goals, budget, constraints, successCriteria).
- Soft: **01** for `Shop.storefrontUrl`.
- Soft: **04** for event context / top collections.

## Out of scope
- Completing payment or creating real orders.
- **Full LLM-reactive browsing / LangGraph / “decide next click” via LLM** — **forbidden** for weekend (D32). Day-1 = **scripted** Playwright paths + light heuristics only. See `../scope/AI_CALL_CONTRACT.md`.
- Storefront API cart as primary path (optional later).
- WebGL fingerprint stealth farms; multi-store concurrency.
- Writing recommendation copy (Epic 07) — but emit scores it needs.
- **Fake Admin progress** (localStorage theatre) or **MCP Todo / Cloud Agents as shopper runtime** — see RUN_AGENTS_UI_CONTRACT.
- Mutating `GraphEdge` / `EventCandidate` confidence from agent runs (Epic 04 static until re-score).

## User / system stories (Given/When/Then)
1. **Given** Race-day taper Ready + storefront URL, **When** merchant clicks Run agents, **Then** AgentRun `running` appears and timeline advances through browse steps.
2. **Given** agent reaches checkout, **When** checkout page is detected, **Then** run stops with outcome `checkout_started` and **does not** fill payment or submit.
3. **Given** missing size XL / buried size guide, **When** agent cannot satisfy constraints, **Then** InsightScore `missing_variant` or `ux_trap` is recorded and outcome may be `abandoned`.
4. **Given** clear Race Kits collection + strong PDP, **When** ATC succeeds within budget, **Then** AffordanceScore entries exist for collection + product.
5. **Given** Playwright failure (timeout), **When** run errors, **Then** status `failed` with error message; no partial payment side effects.
6. **Given** PipelineRun stage `personas` just succeeded and `agentsAutoRun=true`, **When** stage `agents_queue` runs, **Then** ≤3 Ready personas each get one AgentRun `queued` (idempotent per `pipelineRunId+personaId`); concurrency remains 1.
7. **Given** Settings **Pause auto agents**, **When** pipeline reaches `agents_queue`, **Then** stage is `skipped` (not failed); personas remain Ready; no auto Playwright. Manual **Run agents** follows [RUN_AGENTS_UI_CONTRACT](../scope/RUN_AGENTS_UI_CONTRACT.md): disabled while paused unless **force headed demo**, or after unpause.

## Data model (tables/fields or TypeScript interfaces)
```ts
model AgentRun {
  id          String @id @default(cuid())
  shopId      String
  personaId   String
  eventId     String?
  status      String // queued|running|stopped_before_payment|completed|failed
  outcome     String? // carted|checkout_started|abandoned|failed
  startedAt   DateTime?
  endedAt     DateTime?
  progressPct Int @default(0)
  timelineJson String? // [{ at, step, label, status }]
  storefrontUrl String?
  errorMessage String?
}

model AffordanceScore {
  id         String @id @default(cuid())
  shopId     String
  personaId  String
  runId      String
  targetType String // product|collection|copy|nav|filter|page
  targetRef  String
  score      Float  // 0..1
  evidenceJson String
  notes      String? // British English
}

model InsightScore {
  id          String @id @default(cuid())
  shopId      String
  personaId   String
  runId       String
  targetType  String
  targetRef   String
  score       Float
  insightKind String // dead_end|missing_variant|weak_copy|ux_trap|price_shock|trust|sizing
  evidenceJson String
  notes       String?
}
```

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **Action:** `POST /app/runs` body `{ personaIds?: string[]; forceHeadedDemo?: boolean }` — see CONTRACTS §5.5 / RUN_AGENTS_UI_CONTRACT.
- **Auto:** `agents.enqueueForPipeline(shopId, pipelineRunId)` — PipelineRun stage `agents_queue`; cap 3; respect `agentsAutoRun`.
- **Worker:** `npm run agents:run` polls `AgentRun` status=queued; launches Playwright.
- **Polling:** `GET /app/runs/:id` loader returns progress + timeline (hackathon: 2s client poll; no requirement for websockets).
- **Hard stop rules in code comments + assertions:** never click Pay / Complete order / Buy with Shop Pay submit.

### Agent loop (MVP) — scripted / heuristic DECIDE only (NO LLM)
```
LOAD Persona + Event + catalogue hints
SET viewport mobile|desktop from constraints
goal_queue ← goals; budget ← budgetMax
WHILE steps < 40 AND !timeout:
  OBSERVE → DECIDE (scripted path + light heuristics — NEVER llm.completeOptional) → ACT
  SCORE affordance/insights
  IF successCriteria → outcome checkout_started|carted; BREAK
  IF stuck URL×3 → abandoned + insights; BREAK
STOP before payment
PERSIST scores + timeline
```
**Lock:** Do not call OpenAI/Anthropic from the Playwright runner. Naming/blurbs happen in epics 04/05 jobs, not here.

**Scripted happy path (Harbour Run Dawn):** `/` → **Race Kits** → race tee ATC → youth run tee (size-guide stall) → `/cart` → checkout URL → **STOP** (`path-harbour-run-dawn.json`).

## UI (if any) — screens, components, copy samples British English
- Refs: `ui/agent-run.html`, Run agents CTA on Overview.
- Toast: “Agents queued — Race-day taper is heading to your storefront.”
- Timeline steps sample: “Opened home”, “Opened Race Kits”, “Viewed Race Tee”, “Added to cart”, “Opened Youth Run Tee”, “Reached checkout — stopped before payment”.
- Outcome card: “Carted · checkout started”.
- Disclaimer: “No payment was taken. Runs stop at checkout.”

## Algorithms / heuristics (formulas, thresholds)
- Affordance +0.2 collection match, +0.3 PDP keyword match to goals, +0.3 ATC success, +0.2 checkout reach (clip 0–1).
- Insights: missing variant +0.8; price > budgetMax +0.7 `price_shock`; same URL ×3 +0.6 `dead_end`; no size guide link when sizing constraint +0.5 `sizing`.
- maxSteps 40; timeout 180s per run.
- Concurrency: 1 run at a time on hackathon machine.
- Auto-queue cap: ≤3 Ready personas per PipelineRun; no unbounded swarms.

## Ethics / provenance labels required
- Agent telemetry = OBSERVED (system).
- Notes must not include customer PII from storefront account forms — use guest path only; do not submit email/password.
- Banner on Agent runs: stop-before-pay policy.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Playwright may run **in-process** on the app server (weekend OK) or sibling `npm run agents:run` sharing Prisma — CONTRACTS §2c. Must not leave runs queued forever.
- Target Online Store URL only (not Admin).
- Guest checkout path; fill only non-payment fields if needed for navigation — prefer stop at checkout page load.
- Scopes unchanged (agents do not use Admin write).

## Acceptance criteria (checkbox list, testable)
- [ ] Run agents enqueues ≥1 AgentRun for Ready persona.
- [ ] Happy-path fixture/store completes with outcome `checkout_started` or `carted`.
- [ ] Code path guarantees no click on payment submit (unit test / selector deny-list).
- [ ] ≥1 AffordanceScore and ≥1 InsightScore across demo runs (insights may come from seeded second persona path).
- [ ] TimelineJson has ≥5 steps on success.
- [ ] progressPct reaches 100 on completed.
- [ ] Failed run does not mark completed.
- [ ] British English notes on scores.
- [ ] After PipelineRun personas stage, auto-queue ≤3 AgentRuns when `agentsAutoRun=true` (D26); skip stage cleanly when paused.
- [ ] Auto-enqueue idempotent on `pipelineRunId + personaId`; no duplicate queued/running rows for same pair.
- [ ] Unbounded agent swarms never start; payment never auto-starts; storefront never written.
- [ ] Runner has **no** LLM provider dependency; decide-next-action is scripted/heuristic only (AI_CALL_CONTRACT).
- [ ] **RUN_AGENTS_UI_CONTRACT:** Manual Run agents → real AgentRun visible on Agent runs (2s poll); headed default for manual demo; Insights card cites that run id; no fake UI.

## Implementation checklist for a coding agent (ordered steps)
1. Add AgentRun / AffordanceScore / InsightScore models; migrate.
2. Add `POST /app/runs` action + queue rows status=queued.
2b. Implement `agents.enqueueForPipeline` for PipelineRun stage `agents_queue` (caps + pause toggle).
3. Scaffold `agents/runner.ts` with Playwright chromium launch.
4. Implement scripted path using persona constraints (size, mobile viewport 390×844).
5. Implement observe helpers (title, H1, price, ATC button).
6. Implement stop-before-pay guard (URL + button text deny-list).
7. Write score emitters + timeline appender.
8. Add polling UI hook (Epic 08) per RUN_AGENTS_UI_CONTRACT — 2s Prisma poll; headed default for manual Run agents; ensure API shape ready.
9. Record demo fallback: if storefront flaky, `agents/replay/demo-run.json` can hydrate a completed run labelled MOCK timeline for pitch backup — badge clearly.
10. Document `SHOP_STOREFRONT_URL` override env.

## Fixtures / seed data required
- `fixtures/agents/path-harbour-run-dawn.json` — **primary** Dawn path (weekend SoT).
- `fixtures/agents/path-football-merch.json` / `path-harbour-athletic-dawn.json` — **SUPERSEDED** (optional secondary).
- `fixtures/agents/demo-completed-run.json` — **emergency/dev MOCK only**; never PoC acceptance / never unbadged.
- Dev store theme: Dawn + Race Kits + sized products + cart + checkout (`live-demo-store/`).
- Deny-list: CONTRACTS enumerated SoT.

## Test plan
- Unit: deny-list blocks “Pay now”, “Buy it now” submit.
- Integration: against Shopify prototype store or local mock HTML storefront in `fixtures/storefront-mock/`.
- Manual: click Run agents → watch `/app/runs/:id` progress → confirm no order created in Admin.



## Live demo DoD (Harbour Run) — 24 Sep 2026

For a **live / demo-live** pitch (see `../scope/LIVE_DEMO_GATE.md`):

- [ ] Insights (`InsightScore`) and Affordance scores shown as agent-found **must** come from a completed `AgentRun` against the Dawn Harbour Run storefront (`path-harbour-run-dawn.json`).
- [ ] MOCK replay (`fixtures/agents/demo-completed-run.json`) is allowed only as emergency backup and **must** show provenance **MOCK** in the UI (chip + spoken “replay”).
- [ ] Pause auto agents until one headed path is green; then optional D26 auto-run.
- [ ] Do **not** treat fixture path JSON as evidence of a live shopper without a matching run id.

Pack: `../live-demo-store/` · Path contract: `../live-demo-store/playwright/PATH_DAWN_HARBOUR.md`.
UI contract: [`../scope/RUN_AGENTS_UI_CONTRACT.md`](../scope/RUN_AGENTS_UI_CONTRACT.md).

## Open questions
1. Cart-only vs checkout-start? → **Checkout start** per pragmatic defaults.
2. Screenshot capture? → Nice-if-time; not required for AC.
3. Headless in CI? → Yes headless; demo may use headed if projecting.
4. LLM-driven browsing? → **No** (D32 / AI_CALL_CONTRACT). Scripted Playwright only.
