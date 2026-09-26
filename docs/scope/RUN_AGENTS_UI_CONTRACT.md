# RUN_AGENTS_UI_CONTRACT — Admin **Run agents** → real Playwright shoppers

**Date:** 26 Sep 2026 · Europe/London  
**Status:** **MANDATORY** — P0 weekend gate (closes DEEP_GAP_AUDIT **P0-2** UI half + LIVE_DEMO_GATE Playwright/Insights)  
**Product:** Syndicate  
**Companions:** [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) · [LIVE_DEMO_GATE.md](./LIVE_DEMO_GATE.md) · [AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md) · `epics/06-synthetic-agents.md` · `epics/08-admin-ui.md` · `epics/UI_SCREEN_SPECS.md` · `scope/UI_INTERACTION_CONTRACT.md`

---

## Why this exists

Austin needs a **real** spec so the Admin **Run agents** button actually runs Playwright synthetic shoppers as the correct personas, with progress visible in the UI — **not** a fake box, **not** Vite `localStorage` theatre, and **not** Cursor MCP Todo / Cursor Cloud Agents as the shopper runtime.

This contract is the single source of truth for that click → queue → headed/headless Playwright → Prisma `AgentRun` → Insights path.

**PoC acceptance (26 Sep):** real AgentRun from real Playwright only. `demo-completed-run.json` / unbadged MOCK / localStorage theatre = **NOT PoC**. UI↔DB without real shoppers (bc-18dcc6ca pattern) = **NOT PoC-complete**.

---

## Wrong tools (read this first)

> **Callout — why MCP Todo cannot do this**
>
> | Tool people confuse | What it actually is | Why it cannot run merchant shoppers |
> |---------------------|---------------------|-------------------------------------|
> | **Cursor MCP `TodoWrite` / Todo list** | Assistant chore checklist for the coding agent | No Playwright, no storefront, no Prisma `AgentRun`, no Admin poll. **Forbidden** as merchant agent runtime. |
> | **Cursor Task / subagents** | Coding helpers inside Cursor | Build code only. Not storefront personas. |
> | **Cursor Cloud Agents (D28)** | **BUILD** the Remix/TS app on Origin | Must **NOT** execute merchant `PipelineRun` / storefront shopping. They author the runner; the **Shopify app server** runs it. |
> | **Vite `ui/*.html` + `sessionStorage` / `localStorage`** | Visual / IA prototype | Fake progress bars and simulated timelines. Layout SoT only — **not** the Admin app. |
>
> **Syndicate “agents” = Playwright storefront shoppers (Epic 06).** They are **not** Cursor Task subagents and **not** MCP Todo.

---

## Locked clarifications (do not reopen)

1. Syndicate agents = Playwright Online Store shoppers as Ready personas (Epic 06).  
2. Cursor MCP Todo = assistant chore list only — **forbidden** as merchant agent runtime.  
3. Cursor Cloud Agents **BUILD** the app (D28). They must **NOT** execute merchant `PipelineRun` / storefront shopping.  
4. **“In a UI”** means:  
   - (1) Admin **Agent runs** page shows live status for each run (persona name, path, state, scores when done), polled ~**2s**;  
   - (2) for demo wow, **headed** Playwright window is the **default for manual “Run agents”** so Austin can watch the browser; headless OK for CI.  
   - Optional later: screenshot/trace links on the run row — **not** required to embed the browser inside an Admin iframe for MVP.  
5. **Graph is not recomputed by agents.** Epic 04 (`graph_seed` / `score_link`) writes `GraphEdge` / `EventCandidate` / `ConfidenceScore` from orders + catalogue + makeup — **static until re-score / Refresh store**. Agents write **`AgentRun` + `AffordanceScore` / `InsightScore` only** → feed Insights (Epic 07). **Nobody “fixes” missing graph motion by faking graph updates from agent runs.**

---

## 1. User-visible behaviour

### 1.1 Where the button lives (actual locations)

Verified against `epics/UI_SCREEN_SPECS.md` and `ui/*.html` (`data-run-agents`):

| Surface | Route (Remix) | Prototype | Control |
|---------|---------------|-----------|---------|
| **Overview** | `/app` | `ui/index.html` | Primary **Run agents** in page title actions (above the fold) + secondary sm CTA in personas teaser |
| **Personas list** | `/app/personas` | `ui/personas.html` | Primary **Run agents** in page header |
| **Persona detail** | `/app/personas/:id` | `ui/persona-detail.html` | **Run as this persona** (header) + full-width CTA in agent instructions panel — enqueues **this** `personaId` |
| **Event detail** | `/app/events/:id` | `ui/event-detail.html` | **Run agents** in header (preselects Ready personas linked to the event) |
| **Agent runs** | `/app/runs`, `/app/runs/:id` | `ui/agent-run.html` | Primary **Run agents** on list/detail |

Nav label: **Agent runs** (never “Artifacts”). Insights empty state (B10) may CTA toward Run agents / `/app/runs`.

Green `#008060` only on these primary CTAs (UI_INTERACTION_CONTRACT).

### 1.2 Click behaviour

1. Merchant clicks **Run agents** (or **Run as this persona**).  
2. Remix action `POST /app/runs` (body optional `{ personaIds?: string[]; forceHeadedDemo?: boolean }`) runs on the **Shopify app server**.  
3. Server creates **N** `AgentRun` rows where  
   **N = min(count of eligible Ready personas, cap ≤ 3)`**.  
4. Each row is bound to:  
   - `personaId` (from Ready Persona records; or the single id from Persona detail)  
   - `pathId` / path fixture: **`fixtures/agents/path-harbour-run-dawn.json`** (Harbour Run Dawn contract)  
   - shop storefront URL from `SHOP_STOREFRONT_URL` (or Shop.storefrontUrl)  
5. Initial status: **`queued`**.  
6. UI **immediately navigates or focuses** Agent runs (`/app/runs` or `/app/runs/:id` for the first new id). Toast **T01** (or **T02** if already at cap / in-flight — idempotent, no duplicate swarm).  
7. Rows advance: **`queued` → `running` → terminal**:

| Terminal | Meaning |
|----------|---------|
| **`stopped_before_payment`** | Happy path — checkout page reached / deny-list fired; **no payment**. Preferred UI label for success. Persist as status `stopped_before_payment` **or** status `completed` + outcome `checkout_started` — UI **must** show **stopped_before_payment** (Banner B05). |
| **`completed`** | Allowed when outcome is `carted` (stopped earlier) or legacy mapping; still never paid. Prefer surfacing stop-before-pay language. |
| **`failed`** | Timeout / Playwright error / unrecoverable; `errorMessage` set. |

Also allow outcome values from CONTRACTS: `carted` | `checkout_started` | `abandoned` | `failed`.

### 1.3 Pause / Settings / missing URL — no silent no-op

| Condition | Button | Banner / toast |
|-----------|--------|----------------|
| No `SHOP_STOREFRONT_URL` / storefront URL | **Disabled** | **B06** — Storefront URL missing; Open Settings |
| No Ready persona | **Disabled** | Reason via B06-style / **T12** |
| Already at cap / in-flight (≥1 running or queued at cap) | Disabled or click → **T02** | No duplicate enqueue |
| **Pause auto agents** ON (`agentsAutoRun=false`) | Auto stage `agents_queue` = **skipped**. Manual **Run agents** **disabled** unless explicit **force headed demo** (query/body `forceHeadedDemo=true` **or** Settings “Force headed demo run”) | **B04** (paused) + copy that manual run needs **Resume** or **force headed demo** — **never** silent no-op |
| Unpaused + URL + Ready | **Enabled** | Normal T01 path |

**D26 / LIVE_DEMO_GATE:** default auto-run **ON** in schema, but **Pause ON until one headed path is green**. Manual Run when **unpaused**, or when paused **only** via documented **force headed demo** flag (for Saturday rehearsal).

### 1.4 Stop-before-pay (enforced)

- Deny-list on payment URLs and button texts (`Pay now`, `Complete order`, Shop Pay submit, Buy it now submit, card fields).  
- Run **never** completes checkout / never creates a real order.  
- Banner **B05** on Agent runs + Insights.  
- Guest path only; do not submit email/password as a real account.

---

## 2. Runtime architecture

### 2.1 Who spawns shoppers

```
Admin POST /app/runs  (or PipelineRun stage agents_queue)
        │
        ▼
Shopify app server (Remix) — Prisma write AgentRun queued
        │
        ▼
In-process job OR worker: agents_queue / agents.run
  (npm run agents:run or equivalent polled by app)
        │
        ▼
Playwright Chromium → Online Store (SHOP_STOREFRONT_URL)
        │
        ▼
Prisma: AgentRun timeline + AffordanceScore + InsightScore
        │
        ▼
Epic 07 recommendations.build (optional) → Insights board
```

- Spawned by the **Shopify app server**, reading **Prisma**.  
- **Not** Cursor Cloud Agents. **Not** MCP Todo. **Not** Vite localStorage.

### 2.2 Path + persona binding

| Input | Source |
|-------|--------|
| Path contract | `fixtures/agents/path-harbour-run-dawn.json` + `live-demo-store/playwright/PATH_DAWN_HARBOUR.md` |
| Goals / SKU bias / viewport / budget | **Persona** record (Epic 05) |
| Storefront | `SHOP_STOREFRONT_URL` or Shop.storefrontUrl; optional password gate env if password-protected demo store |
| Mode | `DEMO` / fixture shop vs live Harbour Run — same runner; MOCK replay only labelled |

Playwright follows the Dawn path: Race Kits → shirt ATC → youth run tee (size-guide stall) → cart → checkout start → **STOP**.

### 2.3 Concurrency, cap, headed default

| Rule | Value |
|------|--------|
| Cap per enqueue / pipeline | ≤ **3** Ready personas |
| Concurrency | **1** machine-wide |
| Manual **Run agents** (demo) | **Headed** Chromium by default (`headless: false`) so Austin can watch |
| CI / automated | **Headless** OK |
| Auto after personas (`agents_queue`) | Honour `agentsAutoRun`; Pause → stage `skipped` |
| Timeout | ~180s per run; maxSteps ~40 |

### 2.4 Env

| Var | Role |
|-----|------|
| `SHOP_STOREFRONT_URL` | **Overrides** `Shop.storefrontUrl`; required for browse (else B06, no silent no-op) |
| Optional storefront password | If Dawn password page present |
| `AGENTS_AUTO_RUN` / `ShopSettings.agentsAutoRun` | D26; Pause until headed green |
| `DEMO_FIXTURE_SHOP` | Seed path; same loaders (LIVE_DATA_WIRE) |
| Force headed demo flag | Allows one manual run while paused (documented Settings/action flag) |

### 2.5 Graph boundary (explicit)

**Agents do not mutate `GraphEdge` / `EventCandidate` confidence.**  
After stage 4 (score), the occasion graph is **static** until recompute / Refresh store. Agent outputs = `AgentRun` + scores → Insights only. Faking graph updates from agent progress is **forbidden**.

---

## 3. UI data contract (Prisma-only — align LIVE_DATA_WIRE)

### 3.1 Agent runs loader

```
SELECT AgentRun (+ Persona.name, path id/label, timelineJson, progressPct, outcome, scores)
```

- **No** `localStorage` / `sessionStorage` run simulation.  
- **No** hard-coded fake progress in Remix routes.  
- Poll `GET /app/runs/:id` (or list) every **~2s** while any row is `queued`|`running`; stop on terminal; polite live region (“Updating…”).

### 3.2 Row fields visible while live

| Field | Source |
|-------|--------|
| Persona name | `Persona.name` join |
| Path | `path-harbour-run-dawn` label |
| State | `queued` \| `running` \| `stopped_before_payment` \| `completed` \| `failed` |
| Progress % | `progressPct` |
| Timeline steps | `timelineJson` |
| Scores when done | AffordanceScore / InsightScore for `runId` |

### 3.3 On complete → Insights

1. Runner persists ≥1 AffordanceScore and/or InsightScore with `runId = AgentRun.id`.  
2. Epic 07 may create Recommendation / artifact rows referencing that **`agentRunId`**.  
3. Insights board (`/app/artifacts`) refresh shows cards with **that** `agentRunId`.  
4. LIVE_DEMO_GATE: agent-attributed cards **require** a completed / stopped_before_payment `AgentRun` id.

### 3.4 Forbidden

- Marking Insights complete **without** `AgentRun`  
- Fake progress bars / Vite theatre pitched as live  
- MCP Todo as runtime  
- Cloud Agent as shopper  
- Embedding live browser in Admin iframe (MVP) — **P2 stretch only**  
- Agents rewriting GraphEdge / EventCandidate confidence  
- LLM driving Playwright decide/act (`AI_CALL_CONTRACT` — scripted path only)

---

## 4. Acceptance tests / Definition of Done

### 4.1 Primary AC

**Given** seeded Ready personas (≥1) + storefront URL (or demo storefront stub),  
**When** merchant clicks **Run agents**,  
**Then**:

- [ ] ≥1 `AgentRun` reaches **`stopped_before_payment`** or **`completed`** with outcome `checkout_started` / `carted` (never paid)  
- [ ] Agent runs UI showed `queued` → `running` → terminal via **~2s poll** (Prisma)  
- [ ] Insights board shows ≥1 card referencing **that** `agentRunId`  
- [ ] No GraphEdge / EventCandidate confidence mutation attributable to the run  

### 4.2 Headed smoke checklist (Saturday)

- [ ] Pause ON until first green; then optional unpause / D26 auto  
- [ ] Manual Run agents opens **headed** Chromium; Austin can watch Dawn path  
- [ ] Stop at checkout; B05 visible; Admin Orders shows **no** new agent order  
- [ ] Run row shows persona name + path + terminal state  
- [ ] Insights card cites that run id (speakable in DEMO_SCRIPT)  
- [ ] Force headed demo documented if needing a run while Pause still ON  

### 4.3 CI

- [ ] Headless path against mock storefront or stub  
- [ ] Deny-list unit/integration assertion: **no** navigation/click to Pay now / payment submit  
- [ ] Cap ≤3 and concurrency 1 covered by test or invariant assert  

### 4.4 Emergency MOCK

`fixtures/agents/demo-completed-run.json` hydrate **only** with visible **MOCK** badge + spoken “replay” — never silent stand-in for a live AgentRun (LIVE_DEMO_GATE).

---

## 5. Explicit non-goals

| Non-goal | Notes |
|----------|--------|
| MCP Todo / Cursor Task as shopper runtime | Assistant chore list only |
| Cursor Cloud Agents as runners | D28 — build ≠ execute merchant PipelineRun |
| Embedding live browser in Admin iframe | P2 stretch; headed OS window is MVP wow |
| Agents mutating GraphEdge / EventCandidate confidence | Epic 04 static until re-score |
| LLM decide-next-click / LangGraph shopper | AI_CALL_CONTRACT; scripted Playwright only |
| Completing payment / real orders | Stop-before-pay forever for MVP |
| Unbounded agent swarms | Cap ≤3, concurrency 1 |

---

## 6. Cross-links (implementers)

| Doc | Role |
|-----|------|
| `epics/06-synthetic-agents.md` + `PROMPTS/06.md` | Runner implementation; this contract **mandatory** |
| `epics/08-admin-ui.md` + `PROMPTS/08.md` | Button wires to **real** POST + poll — not toast-only |
| `scope/LIVE_DATA_WIRE.md` | Prisma-only; agent path linked here |
| `scope/LIVE_DEMO_GATE.md` | Checkbox: Run agents → real AgentRun visible in UI |
| `scope/WEEKEND_BUILD_SPEC.md` / `AGENT_KICKOFF.md` | P0 pointer to this contract |
| `scope/DEEP_GAP_AUDIT.md` | P0-2 dedicated contract |
| `scope/AI_CALL_CONTRACT.md` | LLM must **not** drive Playwright |
| `scope/UI_INTERACTION_CONTRACT.md` | T01/T02, B04/B05/B06, 2s poll |

---

## 7. Architecture locks (do not reopen)

D26 capped agents + Pause · D28 Cloud Agents build ≠ runtime · D29 Insights naming · D32 templates-first / no LLM Playwright · stop-before-pay · LIVE_DATA_WIRE Prisma-only · graph static post-score until recompute · Harbour Run / running primary vertical.
