# BUILD_ORDER — phased weekend plan

**Date:** 26 Sep 2026 · Europe/London  
**Companion:** [AGENT_KICKOFF.md](./AGENT_KICKOFF.md) · [WEEKEND_BUILD_SPEC.md](./WEEKEND_BUILD_SPEC.md) · [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) · [AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md) · [SDD_PLAYBOOK.md](./SDD_PLAYBOOK.md) · [FIXTURES_MANIFEST.md](./FIXTURES_MANIFEST.md) · `epics/PROMPTS/`

One phase = merge gate before the next. One epic ≈ one Cloud Agent PR (`epic/01-oauth-shell`, …).  
**Status:** BUILD **GREENLIT**.

---

## Phase 0 — Fixtures + Prisma models (no Shopify yet)

| | |
|--|--|
| **Inputs** | `CONTRACTS.md` Prisma sketch · `DATA_DICTIONARY.md` · `fixtures/**` (already authored) · `FIXTURES_MANIFEST.md` |
| **Outputs** | Prisma schema aligned to CONTRACTS; seed scripts that load fixtures **into SQLite**; CI can assert golden JSON parses |
| **AC smoke** | All fixture paths in FIXTURES_MANIFEST load via seed; `expected-scores.json` schema valid; no Remix routes required |
| **Agent slices** | 1 — “schema + seed only” |
| **Merge gate** | Schema review; no Partner app required; **A1 not blocking**; seed leaves queryable rows |

---

## Phase 1 — Epic 01 scaffold Remix / OAuth shell

| | |
|--|--|
| **Inputs** | `epics/01-install-oauth-shell.md` · `PROMPTS/01.md` · `fixtures/session/demo-shop.json` · CONTRACTS Shop/Session/env |
| **Outputs** | Remix Shopify app; OAuth scopes exact; App Bridge shell; `DEMO_FIXTURE_SHOP=1` path; uninstall webhook stub |
| **AC smoke** | Install or fixture session shows Connected + domain; scopes string exact; no write_* |
| **Agent slices** | 1 |
| **Merge gate** | Shell boots locally / Cloud Agent preview; Settings stub route optional |

---

## Phase 2 — 02 ∥ 03 (parallel)

| | 02 Shopify ingest | 03 Event catalogue |
|--|-------------------|--------------------|
| **Inputs** | epic 02, orders/products fixtures, AUTO_PIPELINE stage a | epic 03, SIGNAL_SOURCES / **WEEKEND_SIGNAL_P0** (D33), catalogue fixtures |
| **Outputs** | Orders/products/collections/geo in SQLite; StoreMakeupSnapshot | **Hard P0:** race PROXY seed + `weather.forecastLocal` + `social.hashtagTrends`. **Soft-degrade:** webHarvest / virtual / activity / football |
| **AC smoke** | ≥20 fixture orders seed; PCD city/sector only | Watchlist + race PROXY + weather; MOCK trends OK; webHarvest/virtual/activity/football soft-fail OK; no twitter.com / parkrun CDN fetch |
| **Agent slices** | 1 each (parallel OK after 01) |
| **Merge gate** | Both green independently; pipeline stage a/c stubs callable |

---

## Phase 3 — 04 → 05 (serial)

| | |
|--|--|
| **Inputs** | epic 04 + `fixtures/graph/expected-scores.json` → then epic 05 + `fixtures/personas/demo.json` (A6) · [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) |
| **Outputs** | Graph edges + EventCandidates + confidence **in Prisma**; then ≥2 personas + fashion stub |
| **AC smoke** | Golden bands; Race-day taper / Wet-weather trainer Ready/Draft + stub; runner stretch **not** required; `listEventCandidates` returns DB rows |
| **Agent slices** | 2 serial |
| **Phase note (AI)** | Epic **05** must implement **template** naming/blurb path first; optional LLM behind `SYNDICATE_LLM_PROVIDER` / keys ([AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md)). |
| **Merge gate** | Overview/Events **can** list events + personas from DB; LLM-off path green. **UI consumers must not rely on route-imported JSON.** |

---

## Phase 4 — 06 ∥ 07 (parallel)

| | 06 Synthetic agents | 07 Recommendations |
|--|---------------------|---------------------|
| **Inputs** | epic 06, agent path + demo-completed-run fixtures | epic 07, recommendations/demo.json (**seed**), artifacts.html, LIVE_DATA_WIRE |
| **Outputs** | Playwright runner stop-before-pay; Affordance/Insight scores **in DB** | Insight/merch/collection cards **persisted**; deep links |
| **AC smoke** | Outcome checkout_started; deny-list hit test; MOCK replay labelled | ≥3 Recommendation rows in SQLite; kids size guide P0 present |
| **Agent slices** | 1 each |
| **Phase note (AI)** | Epic **07**: deterministic `recommendations.build` templates **first**; `ai.recPolish` optional behind feature flag. Epic **06**: **no** LLM decide-next-action — scripted Playwright only. |
| **Merge gate** | Artifacts board **data** exists in DB for Epic 08; templates-only recs + scripted agents |

---

## ★ Vertical slice wire (P0 weekend gate — amend Phases 3–5)

**Must pass before Epic 08 is mergeable as “demo-ready.”** Detail: [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md).

| | |
|--|--|
| **Inputs** | Seeded SQLite + pipeline through recommendations; Epic 08 route loaders |
| **Outputs** | Overview KPIs + Events list + Insights \| Frictions board populated **from Prisma** |
| **AC smoke** | `npm run db:seed && npm run pipeline:demo` (or equiv.) → boards non-empty **without Partner**; no `import demo.json` in primary board routes; `DEMO_FIXTURE_SHOP=1` uses **same** loaders |
| **Merge gate** | **UI cannot merge with fixture-only Insights.** Static HTML / route JSON imports are anti-patterns. Verified Prisma hit on Events + Insights loaders. |

May start Epic 08 shell chrome earlier, but **loader wiring to Prisma** is the gate — not “fixtures stub forever.”

---

## Phase 5 — 08 → 09 polish + DEMO_SCRIPT rehearsal

| | |
|--|--|
| **Inputs** | epic 08/09, UI_SCREEN_SPECS, **LIVE_DATA_WIRE**, ui HTML (layout SoT), DEMO_SCRIPT, AUTO_PIPELINE strip |
| **Outputs** | All Admin screens; Settings empty/loading/error; pipeline strip; Pause agents; **Prisma-backed boards** |
| **AC smoke** | Routes in UI_SCREEN_SPECS render from DB; DEMO_SCRIPT 5–7 min dry-run; British English; LIVE_DATA_WIRE checkboxes |
| **Agent slices** | 2 serial (08 then 09) — 08 chrome may have started earlier; **data path must satisfy Vertical slice wire** |
| **Merge gate** | Pitch rehearsal pass; live OAuth → stages a→f when A1 store available; LIVE_DEMO_GATE when headed green |

---

## Parallelisation diagram

```
P0 fixtures/schema (+ seed → SQLite)
    → P1 01
        → P2 02 ∥ 03
            → P3 04 → 05          ⎫
                → P4 06 ∥ 07      ⎬ → ★ Vertical slice wire (UI↔DB)
                    → P5 08 → 09 + demo rehearsal
```

**A1 store** blocks live Partner demo wow, **not** Phases 0–1 or fixture-seeded Phases 2–5 / vertical slice.
