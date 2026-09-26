# PLAN_HOLES_DELTA — executive review for Austin

**Date:** 26 Sep 2026 · Europe/London  
**Author:** Grok Bot (docs-only pass) · no app code · no Origin push  
**Vertical:** Harbour Run / running  
**Companion ledger:** [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md)

---

## PoC bar (your raise — baked in)

**Fully wired working PoC = REAL runtime only:**

- Admin = Prisma only (`LIVE_DATA_WIRE`)
- Run agents = real `AgentRun` + headed Playwright (`RUN_AGENTS_UI_CONTRACT`)
- Agent-found Insights **MUST** cite a real completed / `stopped_before_payment` AgentRun from **that** session
- **Forbidden for PoC:** Vite as Admin; route `import demo.json`; localStorage fakes; unbadged MOCK; MCP Todo; Cloud Agents as shoppers; `demo-completed-run.json` as happy path
- Labelled MOCK = emergency/dev only — **never** PoC acceptance
- **bc-18dcc6ca:** UI↔DB landed but mock AgentRun → **NOT PoC-complete**

---

## Already solid (do not re-litigate)

- D26–D33, A5 hybrid, A8 templates-first, A13 no nightly, read scopes only, SQLite/Prisma, stop-before-pay, social never OBSERVED alone, Cloud Agents build≠shoppers, agents≠graph writers
- `LIVE_DATA_WIRE` · `RUN_AGENTS_UI_CONTRACT` · `LIVE_DEMO_GATE` · `DEEP_GAP_AUDIT` P0 list
- Harbour Run seed pack + `path-harbour-run-dawn.json`
- Graph static after stage 4 until Refresh; agents write AgentRun + scores only

---

## Just plugged (spec — 26 Sep)

1. Football-as-primary leftovers → SUPERSEDED banners + Harbour Run SoT (epics 01/07, root legacy docs, paths, goldens)
2. Graph replace → **delete-all-then-rewrite** locked (CONTRACTS / epic 04)
3. EventCandidate vs CatalogueEvent → Events routes use **EventCandidate.id** only
4. POST `/app/runs` + timeline schema thickened; `stopped_before_payment` status
5. Deny-list **enumerated SoT** in CONTRACTS
6. Storefront URL: env **overrides** Shop field; else B06
7. Weekend golden scores = `expected-scores-running.json`; football goldens SUPERSEDED
8. Path SoT = `path-harbour-run-dawn.json`; football/athletic SUPERSEDED
9. `recommendations/demo.json` gate — no agent-found pitch without real runId or MOCK badge
10. Worker = **in-process OK**; no pending-forever
11. Dual UI ban — Remix Admin only; Vite = layout SoT
12. **A7 default** locked for pitch (≥1 agent Insight + real AgentRun id + ≥2 Ready personas); you may override
13. PoC REAL-runtime language in LIVE_DEMO_GATE / WEEKEND_BUILD_SPEC / AGENT_KICKOFF / HOLES_PLUGGED
14. **D33 (26 Sep):** Weekend catalogue hard P0 locked = **weather** + **race/running calendar PROXY** + **social.hashtagTrends** (watchlist); webHarvest / virtual / activity / football = soft-degrade / not DoD — see `WEEKEND_SIGNAL_P0.md` · `SIGNAL_SOURCES.md`

---

## Remains open

**You (clicks):** A1 store · A3 storefront URL · A4 PCD · seed token · Origin repo/secrets/tunnel  

**Build:** real Playwright runner + Insights from that run (kill mock-AgentRun path) · pipeline stage drain · Prisma vertical-slice smoke · gate sign-off  

**Deferred on purpose:** nightly, Neo4j, LLM browsers, write scopes, multi-theme selectors, football-primary

---

## Recommended next 3 moves

1. **Build:** Replace any mock AgentRun path — wire `POST /app/runs` → in-process Playwright → `stopped_before_payment` → Insights with that `agentRunId` (PoC killer).  
2. **Austin:** Create `harbour-run-demo`, PCD L2, paste `SHOP_STOREFRONT_URL`, seed ≥20–40 orders, Pause ON until first headed green.  
3. **Sign** `LIVE_DEMO_GATE` only after headed run id is speakable on Insights — then rehearse DEMO_SCRIPT 5–7 min.

---

## Judgement calls made (docs)

- A7 default locked so build is not blocked; override left explicit for you  
- In-process worker chosen over mandating a separate process for weekend  
- Delete-all-then-rewrite chosen over upsert-merge for EventCandidates  
- Copied lab `expected-scores-running.proposed.json` → `fixtures/graph/expected-scores-running.json` as weekend golden (did not delete football file; marked SUPERSEDED)  
- Did **not** mark Partner clicks as plugged

---

## 26 Sep afternoon — post-D33 / Playwright-proof

**Full ledger:** [`HOLES_PASS_2026-09-26b.md`](./HOLES_PASS_2026-09-26b.md) · **Flow:** [`TOP_LEVEL_FLOW.md`](./TOP_LEVEL_FLOW.md)

**New facts baked in:** D33 catalogue cut locked · Origin **Dawn-stub Playwright proven** · Partner `harbour-run-demo` URL **still pending** · PoC still requires Prisma Admin + real AgentRun + Insights cite that run (stub proof alone ≠ PoC).

### Top open holes (ranked)

| Pri | One-liner |
|-----|-----------|
| **P0** | A1 Partner `harbour-run-demo` not created (Austin) |
| **P0** | A3 storefront URL pending — Dawn stub ≠ Partner storefront (Austin) |
| **P0** | Wire proven Playwright into `POST /app/runs` → real AgentRun → Insights cite that runId (build) |
| **P0** | Join unproven in Admin: OBSERVED orders × weather × geo × race PROXY → EventCandidate Signals (build) |
| **P0** | A4 PCD L2 or honest PCD_REDACTED — else geo/weather join collapses (Austin) |
| **P0** | Pipeline stage drain — no pending-forever (build) |
| **P0** | Prisma vertical-slice smoke after seed+pipeline:demo (build) |
| **P0** | LIVE_DEMO_GATE unsigned — no speakable Partner headed run id (Austin+build) |
| **P0** | Origin durable repo / secrets / toml / tunnel (Austin) |
| **P1** | Missing `open-meteo-forecast-sample.json` while weather is D33 hard P0 |
| **P1** | City→lat/lng SoT when PCD null / thin orders |
| **P1** | Watchlist still football-led; soft-degrade jobs must not look like DoD reds |

**Still deferred on purpose:** nightly, Neo4j, LLM browsers, write scopes, football-primary, iframe embed.

**Next 3 (unchanged intent, sharper):** (1) Build wire Origin runner → Remix PoC Insights path. (2) Austin A1/A3/A4 + seed. (3) Prove join on Events Signals then sign LIVE_DEMO_GATE.
