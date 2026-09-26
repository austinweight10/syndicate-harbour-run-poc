# ADVERSARIAL_REVIEW — hostile weekend plan autopsy

**Date:** 24 Sep 2026 · Europe/London  
**Stance:** Hired to rip the Syndicate Cursor Commerce weekend plan apart. Fair on strengths; no corporate softener.  
**Inputs:** `WEEKEND_BUILD_SPEC.md`, `AI_CALL_CONTRACT.md`, `UI_INTERACTION_CONTRACT.md`, `RISKS_AND_DECISIONS.md`, `PLAN_COMPLETENESS.md`, `AGENT_KICKOFF.md`, `BUILD_ORDER.md`, `NON_FUNCTIONALS.md`, `CONTRACTS.md`, `SIGNAL_SOURCES.md`, `AUTO_PIPELINE_ON_INSTALL.md`, `SEQUENCE_INSTALL_TO_RECOMMENDATION.md`, `DEMO_SCRIPT.md`, `FIXTURES_MANIFEST.md`, epics 01–09, `MVP_ARCHITECTURE.md`, `DEEP_PLAN.md`, labs `/workspace/syndicate-graph-lab/` + `/workspace/london-runner-demo/`  
**Context:** Docs/UI only; Austin has **not** said **build**. A1 store TBC; A3 storefront URL open; A4 PCD Level 2 open; A2 football-data optional; A7 judge metric open. Runtime AI = templates default OFF (`AI_CALL_CONTRACT.md` / A8 / D32). Playwright scripted. Cloud Agents build ≠ runtime (D28). SQLite graph not Neo4j (D5). D26 agents default ON capped ≤3.

> **Update 24 Sep 2026:** File-side mitigations for A1/A3/A4/Playwright theatre shipped in [`../live-demo-store/`](../live-demo-store/) + [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) + [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md). Austin must still create the Partner store, enable PCD L2, run the seed token, and sign LIVE_DEMO_GATE before claiming live. Until then §2.1 / §2.2 / §2.3 theatre risks still apply.


---

## 1) Executive verdict

**This plan would fail a Cursor Commerce weekend demo as a *live* product claim and only survive as *fixture theatre* — and the docs have already half-admitted that.** Nine epics, a mandatory live PipelineRun a→f (`AUTO_PIPELINE_ON_INSTALL.md` / D27), capped auto-Playwright (D26), a ~550-line `UI_INTERACTION_CONTRACT.md`, social `webHarvest` + virtual/activity P0 catalogue (`SIGNAL_SOURCES.md` / D30 / D31), and Phase-5 polish DoD is a two-week system design in a 48-hour costume. The live path is still blocked on Austin **A1 / A3 / A4** (`RISKS_AND_DECISIONS.md` §3; `PLAN_COMPLETENESS.md` “Still not filled by docs alone”), so the honest demo is Harbour Run fixtures + MOCK agent replay (`DEMO_SCRIPT.md` recovery; `fixtures/` + graph lab) while pitch language still sells “watch your store shop itself.” Judges who ask “is this on *my* shop?”, “where’s the AI?”, or “can you fix the size guide?” will puncture provenance theatre, LLM-off vs AI branding, and read-only recommendations in under a minute. Soft-degrades and MOCK badges are well specified — they also make it trivial to ship a beautiful liar. Without a locked A7 success metric, Sunday cuts will be emotional, not strategic.

---

## 2) Kill shots — top 12 failure modes

### 1. Missing A1 + A3 — no live shop / no Playwright target
- **Manifests:** Merchant/judge sees Connected on the `demo-harbour-run.myshopify.com` story (D22), then fixture-only Overview or agents that never hit a real Online Store. “Install → wow” becomes “we pre-seeded JSON.”
- **Why plan doesn’t prevent it:** `RISKS_AND_DECISIONS.md` leaves **A1** and **A3** P0 open; `BUILD_ORDER.md` says A1 blocks live wow **not** Phases 0–5 fixture work — so the build completes a fake path happily. Epic 06 needs storefront URL; no DoD gate “no Partner store ⇒ cannot claim live.”
- **Severity:** **demo-killer** (live claim) / **credibility** (if pitched as live anyway).
- **Cheapest mitigation:** Lock A1 kit store + A3 `SHOP_STOREFRONT_URL` before weekend. Else open DEMO_SCRIPT with “fixture-backed hybrid” in the first 20s — and don’t click Run agents live.

### 2. Playwright flaky storefront / selector lock-in (R6)
- **Manifests:** Run agents → 180s timeout Banner / failed run; password theme / Dawn selectors miss Harbour Run theme; panic hydrate `fixtures/agents/demo-completed-run.json` while still saying “live.”
- **Why plan doesn’t prevent it:** R6 already H/H; epic 06 has **no durable selector contract for arbitrary themes**; path is football-merch-specific (`fixtures/agents/path-harbour-run-dawn.json`). Concurrency 1 doesn’t fix wrong CSS.
- **Severity:** **demo-killer** (agent beat is the emotional core of `DEMO_SCRIPT.md` ~3:10–5:00).
- **Cheapest mitigation:** One headed pre-warm on the *exact* theme; MOCK replay one click away — **say Mock**; Pause auto agents (D26) so install doesn’t surprise-fail mid-pitch.

### 3. Insights | Frictions without real agent evidence
- **Manifests:** Artifacts board shows buried kids size guide / shipping shock / away copy from `fixtures/recommendations/demo.json` while agents never completed. Judge: “what did the shopper hit?” Answer: template rows.
- **Why plan doesn’t prevent it:** Epic 07 + fixtures seed board copy for “reliable demo”; lift-only recs allowed without agents; `DEMO_SCRIPT.md` recovery skips to seeded Artifacts. Chips only help if voice doesn’t overclaim OBSERVED agent evidence.
- **Severity:** **credibility** (borderline demo-killer if called).
- **Cheapest mitigation:** If no completed AgentRun, force **MOCK** badge + spoken “seeded rehearsal”; prefer one real `checkout_started` over a full fake board.

### 4. LLM off vs “AI / agents / intelligence” pitch mismatch
- **Manifests:** Judge: “Where’s the model?” Spec answer: templates; optional `gpt-4o-mini` / Haiku polish OFF by default (`AI_CALL_CONTRACT.md`, A8, D32). Cloud Agents built code (D28) — easy to claim “AI runs your shop.” “Shopping agents” imply autonomy; epic 06 forbids LLM decide-next-click.
- **Why plan doesn’t prevent it:** Spec honesty is strong; **pitch** in `AGENT_KICKOFF.md` / `DEMO_SCRIPT.md` still leads with agents and occasion intelligence. No mandatory spoken line that runtime is rules + scripted Playwright.
- **Severity:** **credibility**.
- **Cheapest mitigation:** Freeze DEMO_SCRIPT close: “Runtime is rules + scripted Playwright; LLM polish optional and off today.” Never call Cloud Agents the shopper.

### 5. Auto-agents surprise / cost / optics (D26 default ON)
- **Manifests:** Install → Playwright hits storefront (guest carts, WAF — R12/R15). Or three serial 30–90s runs (`NON_FUNCTIONALS.md`) while judge waits. Tunnel drop mid-run (R10).
- **Why plan doesn’t prevent it:** D26 / A14 **locked default ON**; Pause exists in Settings but DEMO_SCRIPT pre-flight doesn’t force Pause for stage. Pipeline stage f auto-queues Ready personas (`AUTO_PIPELINE_ON_INSTALL.md`).
- **Severity:** **demo-killer** (timing) / **credibility** (bot optics).
- **Cheapest mitigation:** Pause auto agents until after Events/Personas beats; run exactly one pre-warmed agent; dedicated demo store; clear carts.

### 6. Provenance theatre — chips present, narrative still overclaims (R11/R19)
- **Manifests:** Spoken “Race-day kit rush ~82%” (`DEMO_SCRIPT.md`) heard as fact; `#MUFC` / webHarvest buzz implied as demand; MOCK Hyrox/parkrun-shaped rows blurred. R11/R19 named this; pitch still uses % as drama.
- **Why plan doesn’t prevent it:** Provenance enum locked (D17) and `SIGNAL_SOURCES.md` ethics are good; DEMO_SCRIPT still scripts ~0.82 as voiceover. Golden bands (`fixtures/graph/expected-scores.json`) train builders to hit Harbour Run numbers.
- **Severity:** **credibility**.
- **Cheapest mitigation:** Spoken line → “we think / labelled hypothesis”; never let social alone upgrade demand (assertRules already say this — enforce in copy review).

### 7. Fixture-only / hybrid demo sold as live Shopify
- **Manifests:** A5 hybrid (≥20 orders → live) with thin A1 store falls back to fixtures; `syndicate-graph-lab` + `london-runner-demo` are **labs not live Shopify** (`WEEKEND_BUILD_SPEC.md`; lab READMEs). Network tab: no Admin GraphQL.
- **Why plan doesn’t prevent it:** Labs correctly labelled; DEMO_SCRIPT allows Live **or** fixture ingest labelled — label dropped under time pressure. `PLAN_COMPLETENESS.md` ~9.2 docs score while ops gaps remain.
- **Severity:** **credibility** / **demo-killer** if judge is technical.
- **Cheapest mitigation:** Connected subtitle **Demo data** vs **Live shop** (epic 09); never pitch graph-lab viz as Admin MVP (`GRAPH_VISUAL.md`).

### 8. Weekend timebox — 9 epics + Interaction Contract vs 48h (R8)
- **Manifests:** Sunday 18:00: agents half-broken, P5 polish checklist untouched, DEMO_SCRIPT unrehearsed. Or Cloud Agent swarm merges with drift across `CONTRACTS.md` (~37k) / epic Prisma sketches / `ui/*.html`.
- **Why plan doesn’t prevent it:** `BUILD_ORDER.md` is full 01→09; `UI_INTERACTION_CONTRACT.md` makes P5 require toast/banner/empty rows; epic 03 P0 includes football + weather + watchlist + webHarvest + virtual + activity (D30/D31). R8 names creep; D30/D31 kept baking scope in.
- **Severity:** **demo-killer**.
- **Cheapest mitigation:** §5 cut. Merge gate: **one vertical path green** beats nine epics amber.

### 9. PCD / geo thinness (A4) + empty/thin orders (R1)
- **Manifests:** City/zip null without Level 2 Address → weak G → thin personas → EmptyState or fixture-geo Banner. Hybrid A5 with &lt;20 orders loads fixtures while Connected says live. Zero-order: pipeline soft-continues, demo hollow (`AUTO_PIPELINE_ON_INSTALL.md` emptyOrders / `SEQUENCE_INSTALL_TO_RECOMMENDATION.md`).
- **Why plan doesn’t prevent it:** A4 still P0 open; Banner + fixtures = correct eng, bad stage optics if unexplained.
- **Severity:** **credibility** (demo-killer if geo is the story).
- **Cheapest mitigation:** Enable PCD L2 on Partner app **today**; or seed ≥40 fixture orders and say so.

### 10. Recommendations without write scopes — “fix” that can’t fix (D3/D20)
- **Manifests:** P0 “add kids size guide” deep-links Admin; judge expects Syndicate to apply it. Scopes read-only; export brief “not wired” (D21). Close = advice cosplay.
- **Why plan doesn’t prevent it:** Epic 07 Out of scope bans auto writes — correct — but DEMO_SCRIPT sells “actionable P0” without “you apply this in Admin; we don’t write.”
- **Severity:** **credibility** / **polish**.
- **Cheapest mitigation:** One DEMO_SCRIPT line: “Read-only by design — deep link opens Shopify; we never write your catalogue.”

### 11. Scoring overfit to Harbour Run + London-runner story mismatch (R14)
- **Manifests:** `fixtures/graph/expected-scores.json` Race-day band ~0.72–0.92; other catalogues → flat confidence / wrong archetypes. `london-runner-demo` (Hyde Park 5K, cafés) ≠ running kit UI (`demo-harbour-run`, Race-day taper) — two products collide on stage.
- **Why plan doesn’t prevent it:** `WEEKEND_BUILD_SPEC.md` says London-runner must not block DoD — still in tree as pitch candy. Fixtures + Harbour Run (`FIXTURES_MANIFEST.md`) encode one shop topology.
- **Severity:** **credibility**.
- **Cheapest mitigation:** One vertical for 7 minutes (running merch). London-runner appendix only. Don’t retune formula Sunday to hit 0.82.

### 12. Stop-before-pay false confidence + social harvest ToS edge (R7/R17)
- **Manifests (pay):** Deny-list on paper (epic 06); theme renames Pay / Shop Pay → accidental submit or scary URL. Or agents stop so early “checkout_started” has no Insight evidence.
- **Manifests (social):** `social.webHarvest` allowlist fetch looks like scraping on ethics Q; parkrun MOCK greppable, webHarvest domain creep isn’t (`SIGNAL_SOURCES.md` A15).
- **Why plan doesn’t prevent it:** Stop-before-pay well specified; **deny-list SoT still thin** (`PLAN_COMPLETENESS.md` epic 06). webHarvest is P0 “always attempted” — raises “are you scraping?” even with robots.txt.
- **Severity:** **demo-killer** (payment) / **credibility** (ToS).
- **Cheapest mitigation:** Unit-test deny-list; headed assert no payment URL; for pitch soft-skip harvest + MOCK social and say so; CI grep twitter/x/parkrun hard-deps (already planned).

**Honourable mentions:** Cloud Agent merge chaos / Origin drift (D28 / `AGENT_KICKOFF.md`); token plaintext SQLite (R13); football-data 429 (R3); Open-Meteo non-commercial (R4); no A7 → thrashing; Polaris embed vs cream canvas — D16 `#f2ebe3` vs `UI_INTERACTION_CONTRACT.md` `#f3f0eb`.

---

## 3) Lies we might tell ourselves — 8 soft “locks”

1. **“Plan completeness ~9.2/10 ⇒ weekend-ready.”** (`PLAN_COMPLETENESS.md`) — Docs density ≠ Partner store, PCD, storefront, or merged Remix app.
2. **“D26 agents default ON is immutable product truth.”** — Pitch preference. On a flaky theme it’s a foot-gun; Pause should be demo default until one run is green.
3. **“Templates-first means we’re honest about AI.”** (`AI_CALL_CONTRACT.md`) — Only if spoken pitch matches. Spec OFF + marketing “intelligence/agents” = self-lie.
4. **“Hybrid A5 saves us if the store is thin.”** — Saves engineering; not credibility if Connected implies live OBSERVED makeup.
5. **“Provenance chips make overclaim safe.”** — Chips don’t override a confident ~82% voiceover (`DEMO_SCRIPT.md`).
6. **“Graph lab / london-runner-demo prove the graph.”** — Labs prove scoring on fixtures (`syndicate-graph-lab/README.md`: not Remix/Shopify). Transfer fantasy.
7. **“Nine epics with 02∥03 and 06∥07 fit 48h via Cloud Agents.”** (`BUILD_ORDER.md`) — Ignores integration tax, App Bridge/Polaris, and P5 Interaction Contract DoD.
8. **“A7 can stay open; we’ll feel the metric.”** (`RISKS_AND_DECISIONS.md`) — Without insight vs agent-wow vs speed, Sunday cuts are vibes.

---

## 4) What is actually strong — 5 things that survive scrutiny

1. **Ethics / provenance spine is real.** OBSERVED / AGGREGATE_PROXY / MODEL_HYPOTHESIS / MOCK; no wealth APIs; social never OBSERVED demand alone; parkrun scrape forbidden; stop-before-pay — consistent across `SIGNAL_SOURCES.md`, `AI_CALL_CONTRACT.md`, epics, `DEMO_SCRIPT.md`. Most hackathon “AI” apps don’t try.
2. **Runtime AI contract is disciplined.** Forbidden LangGraph / LLM-Playwright / RAG / Cloud-Agent-as-PipelineRun (`AI_CALL_CONTRACT.md` D32) prevents unbounded-cost death. Templates path as DoD is correct.
3. **Failure-aware sequences exist.** `SEQUENCE_INSTALL_TO_RECOMMENDATION.md` + `AUTO_PIPELINE_ON_INSTALL.md` + DEMO_SCRIPT recovery (tunnel / 429 / Playwright / empty events) show prior burns written down.
4. **Fixture pack is unusually concrete.** Orders/products/catalogue/personas/graph/agents/recommendations on disk (`FIXTURES_MANIFEST.md`) + graph lab golden path = rehearsable without Shopify.
5. **Meaningful cuts are written.** No write_*, no pixels, no Neo4j, no payment complete, fashion stub only, skip nightly (A13) — `WEEKEND_BUILD_SPEC.md` In/Out is enforceable if read under pressure.

---

## 5) Minimum viable weekend cut — 48h ship list

> **Update 26 Sep · D33:** Catalogue hard P0 now locked to weather + race PROXY + social.hashtagTrends. Cut rows below for webHarvest / virtual / activity are **accepted** — see `WEEKEND_SIGNAL_P0.md`.

### KEEP
| Keep | Why |
|------|-----|
| Epic **01** OAuth/shell + Connected + exact read scopes | Table stakes |
| Epic **02** ingest **or** fixture seed (hybrid A5) | Orders/products on screen |
| Epic **03** **thin:** MOCK catalogue + optional football-data **or** Open-Meteo — not both required live | Calendar without harvest/virtual/activity farm |
| Epic **04** ≥2 EventCandidates + confidence breakdown + provenance | Core insight |
| Epic **05** two personas + fashion stub | Pitch characters |
| Epic **06** **one** scripted Playwright path + MOCK replay backup | The wow |
| Epic **07** ≥3 template rec cards (P0 kids size guide) + deep link | Close the loop |
| Epic **08** Overview, Events, Personas, one Run detail, Artifacts — good-enough Polaris | Pitch surfaces |
| Epic **09** minimal: Demo/Live indicator, Pause agents, degraded banners, attribution | Honesty UI |
| `DEMO_SCRIPT.md` 5–7 min + pre-flight | Non-negotiable |

### DROP / DEFER
| Drop | Why |
|------|-----|
| `social.webHarvest` as P0 hard path | **LOCKED D33:** soft-degrade; watchlist + MOCK = hard P0 |
| VirtualEvent + ActivityChallenge P0 (D31) | **LOCKED D33:** soft-degrade / not DoD; race PROXY + weather carry Harbour Run |
| Full `UI_INTERACTION_CONTRACT.md` every toast/hover row | Lite: empty/loading/error + provenance visible |
| `ai.recPolish` / any LLM on stage | Templates only |
| Third persona / Taper-week runner | Already non-DoD (A6) |
| Campaign P2, export brief, screenshots, Storefront API cart | Noise |
| `london-runner-demo` as stage beats | Appendix — vertical mismatch |
| Graph lab force viz in Admin | Offline pitch aid only |
| Nightly refresh, multi-city weather &gt;1, AQ/transport P2 | Already mostly out |
| Parallel Cloud Agent swarm without human merge owner | Serialise 01→02→04→05→06→08 |

**Harsh 48h DoD:** Live or labelled-fixture Overview → 2 events with chips → Race-day taper → one agent `checkout_started` **or** labelled MOCK → Artifacts P0. Else optional colour.

---

## 6) Pre-mortem — “It’s Monday and the demo flopped. What happened?”

### Narrative A — The live path that never existed
Saturday: still no A1. Team ships Phases 0–5 on fixtures + graph lab. Sunday opens with “one-click on your shop.” Judge connects *their* Partner store; OAuth works; PCD geo null (A4); &lt;20 orders → hybrid fixtures; Playwright has no A3 URL and fails. MOCK run hydrated without saying Mock. Fail: **§2.1 + §2.7**.

### Narrative B — Death by auto-agents and theme selectors
A1 exists. D26 auto-runs three agents on install mid-walkthrough; first hits password gate / wrong ATC selector; 180s timeouts serialise; Overview stuck “Agents running…”. Pause buried unread. Seeded Artifacts narrated as “live shopper.” Ethics Q on bot carts (R12). Fail: **§2.2 + §2.5 + §2.3**.

### Narrative C — Scope vanity and AI branding own-goal
Team ships D30/D31 catalogue + full Interaction Contract + optional LLM polish. Sunday merge: Polaris ≠ cream HTML; token drift `#f2ebe3` vs `#f3f0eb`; webHarvest raises “scraping?”; judge asks where the LLM is — “off, templates” after five minutes of “AI shopping agents.” No A7 → fight over cutting agents vs UI. Overruns; skips stop-before-pay line; P0 can’t auto-fix (no write_*). Fail: **§2.4 + §2.8 + §2.10 + §2.11**.

---

## Citation index

| Claim | Where |
|-------|--------|
| A1/A3/A4/A7 still open | `RISKS_AND_DECISIONS.md` §3; `PLAN_COMPLETENESS.md` |
| Agents default ON capped | D26 / A14; `AUTO_PIPELINE_ON_INSTALL.md` stage f |
| LLM optional OFF default | `AI_CALL_CONTRACT.md`; A8; D32 |
| No write_* / can’t auto-fix | D3 / D20; epic 07 Out of scope |
| Playwright H risk / MOCK backup | R6; `DEMO_SCRIPT.md` recovery; epic 06 |
| Labs ≠ live Shopify | `WEEKEND_BUILD_SPEC.md`; `syndicate-graph-lab/README.md`; `london-runner-demo/` |
| UI polish gate vs time | `UI_INTERACTION_CONTRACT.md`; `BUILD_ORDER.md` P5; epics 08/09 |
| Social harvest P0 | `SIGNAL_SOURCES.md` A15; D30 |
| Golden/overfit scores | `fixtures/graph/expected-scores.json`; Harbour Run in `FIXTURES_MANIFEST.md` |
| Docs ≠ ops | `PLAN_COMPLETENESS.md` scorecard + “Still not filled by docs alone” |
| Cream token drift | D16 `#f2ebe3` vs `UI_INTERACTION_CONTRACT.md` `#f3f0eb` |

---

*Spec/review only. Do not push Origin. Do not scaffold until Austin says **build**.*
