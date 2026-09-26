# HACKATHON_PDAY_PLAN — Saturday 26 Sep 2026 (Pitch Day)

**Timezone:** Europe/London (BST)  
**Product:** Syndicate · Harbour Run / running  
**Audience:** Austin (Hackathon lead) + coding agents  
**Status:** **LIVE OPERATIONAL PLAN** — supersedes vague “build all weekend”; does **not** supersede LIVE_DATA_WIRE / LIVE_DEMO_GATE / DEMO_SCRIPT SoT  
**Companions:** [`WEEKEND_BUILD_SPEC.md`](./WEEKEND_BUILD_SPEC.md) · [`BUILD_ORDER.md`](./BUILD_ORDER.md) · [`HOLES_PASS_2026-09-26b.md`](./HOLES_PASS_2026-09-26b.md) · [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) · [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) · [`../live-demo-store/SETUP_RUNBOOK.md`](../live-demo-store/SETUP_RUNBOOK.md)

---

## What “P-day” means

**P-day = Pitch Day** — the day we freeze a speakable Harbour Run demo and rehearse the 5–7 min script. Build continues only to close **PoC P0s**; polish that does not change the pitch is deferred.

**PoC bar (locked):** Prisma Admin + real headed Playwright `AgentRun` + Insights cite **that** run id. Vite / route-import fixtures / unbadged MOCK / `demo-completed-run.json` happy path = **NOT PoC**.

---

## Starting state (10:00 BST — honest)

| Layer | State |
|-------|--------|
| Spec pack | Locked · D33 · Harbour Run vertical · LIVE_DATA_WIRE / RUN_AGENTS contracts |
| `shopify-app/` | Scaffold + Prisma + `pipeline:demo` + Admin routes + Playwright runner **present** |
| Fixture demo path | `db:seed` → `pipeline:demo` → `dev:demo` on `:44731` is the **offline rehearsal** path |
| Dawn stub shopper | `storefront:stub` + `agents:prove` can mint a real `AgentRun` **without** Partner |
| Partner live | **A1 / A3 / A4 unsigned** — live OAuth wow still Austin-click blocked |
| LIVE_DEMO_GATE | **Unsigned** — until signed, open pitch as **hybrid** in first 20s |

**Do not assume** nine epics are perfect. Assume the thin vertical exists; close the holes that make the pitch lie.

---

## Success ladder (pick the highest you can sign)

| Tier | Name | Must be true | Pitch opening |
|------|------|--------------|---------------|
| **T3** | **Live Partner PoC** | LIVE_DEMO_GATE signed · headed run on `harbour-run-demo` · Insights cite that run id | Full DEMO_SCRIPT live beats |
| **T2** | **Stub PoC (honest)** | `agents:prove` on Dawn stub · Admin shows that `AgentRun` · Insights cite that id · Overview/Events from Prisma | “Hybrid / fixture-backed shop + real shopper on a Dawn stub — Partner store next” in first 20s |
| **T1** | **Wire-only backup** | `pipeline:demo` boards non-empty · Pause ON · MOCK replay **labelled** only if agent flakes | Hybrid + “replay” · never claim agent-found without run id |

**Default target for today:** close **T2** by early afternoon; chase **T3** in parallel via Austin clicks. Never claim T3 without a signed gate.

---

## Two tracks (run in parallel)

### Track A — Austin clicks (cannot be coded away)

| Order | Action | Evidence |
|-------|--------|----------|
| A1 | Create Partner store `harbour-run-demo` | Subdomain live |
| A2 | Create Syndicate custom app · scopes exact `read_orders,read_products,read_customers` | `shopify.app.toml` linked · secrets in `.env` |
| A3 | Enable PCD L2 Address (or accept honest `PCD_REDACTED` banner) | City/sector on orders **or** banner |
| A4 | Publish Dawn · menu freeze · cookie banner OFF | SETUP_RUNBOOK theme checklist |
| A5 | Seed ≥20 orders (prefer ≥40) via seed tool / Matrixify | Admin order count |
| A6 | Paste `SHOP_STOREFRONT_URL` (password off preferred) | Env overrides Shop field |
| A7 | One headed rehearsal against Partner Dawn | Run id recorded on LIVE_DEMO_GATE |

Runbook: [`../live-demo-store/SETUP_RUNBOOK.md`](../live-demo-store/SETUP_RUNBOOK.md).

### Track B — Build (PoC close order)

Aligned with [`HOLES_PASS_2026-09-26b.md`](./HOLES_PASS_2026-09-26b.md) § Recommended close order:

1. **Smoke vertical slice** — `pipeline:demo` → Overview / Events / Insights non-empty (H-P0-7).  
2. **Wire shopper into Admin** — `POST /app/runs` → real `AgentRun` → poll → Insights cite that id; kill mock/bc-18dcc6ca happy path (H-P0-3).  
3. **Stage drain** — in-process worker must not leave pipeline stages `pending` forever (H-P0-6).  
4. **Join evidence on Events** — OBSERVED orders × weather × geo × race PROXY speakable on Signals (H-P0-4).  
5. **Partner swap** — same runner, `SHOP_STOREFRONT_URL` = Harbour Run (H-P0-2) → sign gate (H-P0-8).  
6. **Hygiene if time** — running-first hashtag watchlist · soft-degrade UI for D33 soft jobs · deny-list CI (H-P1-*).

**Explicit cuts today:** Vite polish · Neo4j · LangGraph · LLM Playwright · official X/Reddit · Strava OAuth · nightly refresh · football as primary story · full UI_INTERACTION_CONTRACT matrix.

---

## Hour-by-hour schedule

Times are BST. Slide blocks if Austin clicks land early/late — **never** skip the freeze / rehearsal gates.

### Block 0 — 10:15–10:45 · Standup + freeze rules (30m)

| Who | Do |
|-----|-----|
| Both | Read this file + LIVE_DEMO_GATE P0 table aloud once |
| Build | Confirm repo: `cd shopify-app && npm install && npx prisma generate` |
| Austin | Start Track A (A1 store) if not done |
| Both | Agree target tier (T2 default / T3 stretch) and **cut list** above |

**Exit:** Written target tier + who owns A1–A7.

---

### Block 1 — 10:45–12:15 · Offline PoC green (90m) ★ critical path

**Goal:** Prove T2 path without Partner.

```bash
cd shopify-app
npx prisma migrate deploy
npm run pipeline:demo
npm run storefront:stub          # shell 1 — Dawn stub :44741
SHOP_STOREFRONT_URL=http://127.0.0.1:44741 AGENTS_HEADED=0 npm run agents:prove
npm run dev:demo                 # shell 2 — Admin :44731
```

**Checklist**

- [ ] Overview KPIs + lead occasion from Prisma (not Vite)  
- [ ] Events list non-empty · provenance chips visible  
- [ ] `agents:prove` → Agent runs page shows completed / `stopped_before_payment`  
- [ ] Artifacts shows ≥1 agent-attributed Insight with **that** `AgentRun` id  
- [ ] Pause still ON for auto-queue until headed green once  
- [ ] `npm run smoke` (or `npm test`) not red on deny-list / pipeline asserts  

**If red:** fix H-P0-3 / H-P0-7 only — do not polish Settings chrome.

**Exit:** Screenshot or note of run id + Insight card citing it.

---

### Block 2 — 12:15–13:00 · Lunch + Austin Track A push (45m)

| Who | Do |
|-----|-----|
| Austin | Finish A1–A6 as far as possible (store, app, PCD, Dawn, seed, URL) |
| Build | Soft: Events Signals join copy (H-P0-4) · soft-degrade banners for soft catalogue jobs |
| Both | Do **not** unpause auto agents yet |

---

### Block 3 — 13:00–15:00 · Partner path or harden T2 (120m)

**If A1+A3+A6 ready → chase T3**

1. Unset `DEMO_FIXTURE_SHOP` · fill `SHOPIFY_API_*` · `shopify app config link` · `npm run dev`  
2. Install on `harbour-run-demo` · confirm Connected + scopes exact  
3. Sync / Refresh until ≥20 orders (prefer ≥40)  
4. Set `SHOP_STOREFRONT_URL` to Partner Dawn · Force headed demo (or unpause once)  
5. Confirm Insights cite **that** Partner run id  
6. Sign [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) with run id  

**If Partner not ready → harden T2**

1. Headed prove: `AGENTS_HEADED=1` on stub (display required)  
2. Pipeline stage strip advances (H-P0-6)  
3. Join evidence speakable on Events (H-P0-4)  
4. Rehearse hybrid opening line from DEMO_SCRIPT failure table  
5. Optional: running-first hashtag watchlist hygiene (H-P1-4)

**Exit:** Either signed LIVE_DEMO_GATE **or** written “T2 hybrid pitch” decision.

---

### Block 4 — 15:00–16:00 · Demo freeze (60m)

| Freeze | Rule |
|--------|------|
| Code | No feature merges after freeze unless pitch-breaking bug |
| Surface | **Remix Admin only** — never open Vite `src/` / `docs/ui` as the demo |
| Agents | Auto Pause policy as rehearsed; Force headed only if needed |
| Backup | MOCK replay path labelled + spoken “replay” — never silent |
| Vertical | Harbour Run / running primary — football = optional colour only |

Dry-run click path once (no narration):

```
Overview → Labels → Events → Race-day kit rush → Personas → Race-day taper
→ Run agents → Agent runs → Artifacts (P0 from THIS run) → optional Settings
```

---

### Block 5 — 16:00–17:00 · Full pitch rehearsal ×2 (60m)

Use [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) beat sheet. Target **6:30**.

| Pass | Mode |
|------|------|
| 1 | Full narration · timer on · note flake points |
| 2 | Failure recovery drill — kill tunnel OR agent flake once · recover with hybrid / labelled MOCK |

**Sample lines (freeze):** see DEMO_SCRIPT § Sample lines.  
**Optional colour:** [`../../london-runner-demo/PITCH_BEATS.md`](../../london-runner-demo/PITCH_BEATS.md) — do not block MVP DoD on live London storefront.

**Exit:** One clean pass ≤7 min · recovery path spoken once.

---

### Block 6 — 17:00–18:00 · Buffer / judge-ready (60m)

- [ ] Tabs: Admin Overview only (no IDE)  
- [ ] Tunnel healthy · Connected pill green (or honest hybrid badge)  
- [ ] Headed path green **today** once  
- [ ] Backup screen recording of agent run (optional but strong)  
- [ ] Ethics lines ready: Obs/Agg/Hyp/Mock · stop-before-pay · no wealth APIs  
- [ ] LIVE_DEMO_GATE row filled **or** hybrid opening locked  

---

### Block 7 — Pitch window · go time

| Do | Don't |
|----|-------|
| Open with locked tier narrative | Claim Partner-live if gate unsigned |
| Click Run agents and narrate stop-before-pay | Import fixture Insights as “agent found” |
| Point at provenance chips | Lead with football kits |
| Offer one P0 fix card (youth size guide) | Promise write_* / auto theme edit |

---

## Command cheat sheet

| Intent | Command (from `shopify-app/`) |
|--------|-------------------------------|
| Seed + score boards | `npm run pipeline:demo` |
| Fixture Admin | `npm run dev:demo` → http://127.0.0.1:44731/app |
| Dawn stub | `npm run storefront:stub` → :44741 |
| Prove shopper | `SHOP_STOREFRONT_URL=http://127.0.0.1:44741 AGENTS_HEADED=0 npm run agents:prove` |
| Headed | `AGENTS_HEADED=1` (needs display) |
| Smoke | `npm run smoke` / `npm test` |
| Live OAuth | unset `DEMO_FIXTURE_SHOP` · `npm run dev` (`shopify app dev`) |

Root mirrors after `shopify-app` install: `npm run db:setup` · `npm run db:seed` · `npm run dev:shopify`.

---

## Kill / cut decisions (pre-agreed)

| If this is still red at… | Cut / pivot |
|--------------------------|-------------|
| **12:15** — no Prisma boards | Drop polish; only seed + loaders |
| **15:00** — no real AgentRun in Admin | Stay on T1 · labelled MOCK only · rewrite opening |
| **15:00** — no Partner store | Lock T2 hybrid · stop chasing OAuth |
| **16:00** — Events join thin | Narrate OBSERVED Saturday race-tee spike alone |
| **Any time** — payment URL hit | Hard stop · deny-list bug = P0 fix before pitch |

---

## Roles

| Role | Owns |
|------|------|
| **Hackathon lead (Austin)** | Track A clicks · gate sign-off · pitch delivery · A7 metric override (if any) |
| **Build agent / pair** | Track B PoC close · smoke commands · freeze discipline · recovery drill support |
| **Forbidden** | Cloud Agents as shoppers · MCP Todo as runtime · Vite as Admin |

---

## Sign-off (fill on the day)

| Checkpoint | Time | Owner | Initials / run id |
|------------|------|-------|-------------------|
| T2 stub PoC green | | | |
| Target tier locked (T1/T2/T3) | | | |
| LIVE_DEMO_GATE signed (T3 only) | | | |
| Demo freeze | | | |
| Rehearsal pass ≤7 min | | | |
| Pitch ready | | | |

When T3 signed, DEMO_SCRIPT live beats are authorised. Until then, open as hybrid/fixture in the first 20 seconds.
