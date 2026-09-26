# NON_FUNCTIONALS — hackathon service budgets

**Date:** 24 Sep 2026 · Europe/London  
**Context:** 1-day MVP on a single box + Shopify tunnel — not production SLOs  
**Aligned with:** CONTRACTS schedules, epics 02/03/06, sports pipeline rate notes

---

## 1) Latency budgets

| Path | Target (p50) | Soft max (p95 / UX) | Notes |
|------|--------------|---------------------|-------|
| Embedded `/app/*` loader (warm SQLite) | ≤200 ms | ≤1.5 s | No live Admin GraphQL on Overview render |
| OAuth → first Overview paint | ≤5 s | ≤15 s | Ingest async |
| Settings resync enqueue | ≤300 ms | ≤1 s | Return `syncRunId`; work in worker |
| Ingest full (≤500 orders) | ≤90 s | ≤10 min then Banner | Honour Retry-After |
| Catalogue football tick | ≤10 s | ≤60 s | Then circuit |
| Catalogue weather (≤3 cities) | ≤5 s | ≤30 s | |
| `graph.buildAndScore` + personas | ≤10 s | ≤60 s | Demo fixtures |
| `POST /app/runs` enqueue | ≤300 ms | ≤1 s | |
| Agent run (Playwright) | 30–90 s | **180 s timeout** | Fail → status failed |
| Run detail poll interval | 2 s | — | Stop when completed/failed |
| Recommendations build | ≤3 s | ≤30 s | |
| Admin deep link open | N/A (browser) | — | New tab |

**Demo path wall-clock:** Overview → Artifacts narratable **≤7 min** including one agent run (or MOCK replay &lt;10 s hydrate).

---

## 2) Rate limits & throttling

| Upstream | Limit (known / assume) | Syndicate policy |
|----------|------------------------|------------------|
| Shopify Admin GraphQL | Bucket/leaky; 429 + Retry-After | Cap 500 orders; page size modest; backoff 30s→2m→10m; one ingest per shop at a time |
| football-data.org free | ~10 req/min | ≤1 PL matches request per tick; schedule 6h; no tight loops |
| Open-Meteo free non-commercial | Generous daily; be polite | ≤3 cities × 1 forecast / 3h |
| Online Store (Playwright) | Bot / WAF unknown | Concurrency **1**; human-like delays 200–800 ms between actions; guest only |
| Optional LLM (`ai.eventName` / `ai.personaBlurb` / `ai.recPolish`) | Provider TPM | ≤5 calls per score/persona batch (`SYNDICATE_LLM_MAX_CALLS_PER_BATCH`); aggregate non-PII only; templates if off/fail; see `AI_CALL_CONTRACT.md` |

**Client-side:** Disable Re-scan / Run agents while status `running`.

---

## 3) Cost ceilings (hackathon weekend)

| Item | Ceiling | Notes |
|------|---------|-------|
| football-data | £0 | Free tier token |
| Open-Meteo | £0 | Non-commercial + attribution |
| Shopify Partner / dev store | £0 | |
| Tunnel / CLI | £0 | `shopify app dev` |
| LLM (optional) | **≤ $5** total | Naming/blurb/rec polish only (D32); primary `gpt-4o-mini` / fallback Claude Haiku class; **templates if over, missing key, or `SYNDICATE_LLM_PROVIDER=off`** |
| Hyrox / Active / Met Office paid | **$0** | MOCK instead |
| Neo4j cloud / Redis | **$0** | SQLite + in-process jobs |
| Hosting beyond laptop | **$0** for demo | |

**Post-hackathon note:** Open-Meteo commercial → paid plan before App Store production traffic.

---

## 3b) LLM policy (aligned with AI_CALL_CONTRACT)

- **Default:** templates only (A8). Optional OpenAI `gpt-4o-mini` or Anthropic `claude-haiku-4-5` when keys present.
- **Allowed call IDs only:** `ai.eventName`, `ai.personaBlurb`, `ai.recPolish`.
- **Forbidden:** LangGraph runtime, LLM-driven Playwright, embeddings/RAG, vision, customer-email rewrite, social demand scoring via LLM, Cloud Agent as `PipelineRun`.
- **Provenance:** LLM text → `MODEL_HYPOTHESIS` (Hyp).
- **SoT:** [`AI_CALL_CONTRACT.md`](./AI_CALL_CONTRACT.md).


---

## 4) Scalability (explicit non-goals)

- Single shop demo; no multi-tenant perf testing  
- No horizontal workers  
- No 60d+ history (`read_all_orders` out)  
- SQLite fine under ~10k order rows for day-1  

---

## 5) Observability minima

| Signal | Requirement |
|--------|-------------|
| SyncRun / CatalogueJobRun / AgentRun rows | status, timings, counts, errorCode |
| Structured logs | `shopId`, `job`, `durationMs`, `attempt` — **never** accessToken, street, email, phone, raw card fields |
| UI surfacing | Settings last sync; catalogue degraded banner; run error Banner |
| Demo backup | MOCK run hydrate path documented |
| Optional | Simple `console` metrics counters: `ingest.orders`, `agents.completed`, `agents.failed` |

**No requirement:** Datadog/Sentry for hackathon (nice if template includes).

---

## 6) Reliability / failure policy

| Failure | User-visible | Data integrity |
|---------|--------------|----------------|
| Auth fail | Re-auth; not Connected | No partial Shop token write without session |
| Ingest 429 | Banner Retry | Prior rows kept |
| Catalogue fail | Degraded banner | Last-good kept; no wipe |
| Score with empty orders | EmptyState | No fake personas (stub OK) |
| Agent timeout | Run failed | No payment; partial scores optional discard or keep with failed outcome |
| Uninstall | — | PCD wipe job |

**Idempotency:** see CONTRACTS §2.

---

## 7) Security minima

| Control | MVP bar |
|---------|---------|
| OAuth scopes | Exact three read scopes; no write_* |
| Token handling | Offline token server-side only; never in loader JSON or HTML |
| Webhook HMAC | Verify before uninstall wipe |
| PCD | No street/email/phone/name columns; customerHash only; geo sector max |
| Agent | Guest path; payment deny-list; stop at checkout page |
| Secrets | Env vars; DB gitignored; Settings never shows token |
| XSS | Polaris/React escape; do not `dangerouslySetInnerHTML` order notes |
| Dependency | Use Shopify template defaults; no random scraper packages |

---

## 8) Privacy / ethics minima (product NFR)

- Provenance chips on non-observed merchant insights  
- Enrichment legend reachable ≤2 clicks  
- Copy never says income/affluent/wealth for personas  
- Campaign suggestions note Syndicate does not send email  
- Attribution: Open-Meteo + football-data.org on Settings  

---

## 9) Accessibility & UX minima (hackathon)

- Buttons named; Polaris focus on modals  
- Contrast: charcoal on cream; green only CTAs  
- British English spell-check on UI strings  
- Empty / loading / error patterns exist (Epic 09)  

---

## 10) Performance test plan (lightweight)

1. Seed fixtures → measure Overview loader &lt;1.5 s.  
2. Mock 429 on ingest → assert SyncRun errorCode + UI Banner.  
3. Agent deny-list unit test.  
4. One headed run timing logged for demo rehearsal.  
5. Grep CI: no `parkrun.com` fetch; no `shpat_` in Settings snapshots.

---

## 11) Capacity cheat-sheet for pitch

> “We backfill about sixty days of orders, refresh Premier League fixtures a few times a day, pull weather for your top cities, and run one synthetic shopper at a time — stopped before payment.”
