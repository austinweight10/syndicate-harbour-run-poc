# CURSOR_TOOLING — Cursor-first build & honest runtime boundaries

**Date:** 22 Sep 2026 · Europe/London  
**Product:** Syndicate MVP (Cursor Commerce hackathon)  
**Origin home:** `hugeinc/tmp-493181d83584bec6`  
**Status:** Docs only — no application code. **Do not start greenfield app code until Austin says build.**  
**Audience:** Austin + coding agents implementing epics 01–09

---

## Austin’s ask

> Make sure this uses Cursor tools as much as possible.

**Interpretation (locked for this plan):**

| Layer | Prefer Cursor | Stay custom / product runtime |
|-------|---------------|-------------------------------|
| **Build workflow** | Cursor **Cloud Agents** on **Origin**; epic md as agent briefs; `docs/` / this repo as SoT; `origin` CLI / CloudAgent for commits | No parallel GitHub-required SoT workflow |
| **Product runtime** | Only where a **documented** Cursor product API clearly helps | Remix + Prisma/SQLite jobs + **Playwright** storefront runner |
| **Planning / notes** | Optional MCP (Notion etc.) Austin already has — planning notes only | Do **not** invent Cursor commerce / shopper / Shopify APIs |

**Honesty rule:** Do **not** claim fake Cursor product APIs. Cloud Agents + Origin are the Cursor leverage for **building** the app. Synthetic shoppers remain **Playwright** unless we explicitly mark an optional Cursor-browser path as a future swap.

---

## 1) Build workflow — Cursor Cloud Agents on Origin

### Source of truth

- **SoT for the plan and epics:** this workspace (`/workspace/cursor-commerce-hackathon/`) — especially `epics/`, `scope/`, `ui/`, `MVP_ARCHITECTURE.md`.
- **Origin home:** `hugeinc/tmp-493181d83584bec6` — Cloud Agents launch here; commits land via Origin / CloudAgent tooling.
- **No parallel GitHub-required workflow for SoT.** GitHub may mirror or host CI later; it is **not** required for planning SoT or for kicking epic builds. Prefer Origin + Cloud Agents over “open a GH issue / Actions-only greenfield” as the primary build path.

### Docs-only until Austin says build

1. Keep expanding / freezing docs in `docs`-equivalent trees (`scope/`, `epics/`, root plan md, `ui/`).
2. **Do not** scaffold Remix, Prisma migrations, or Playwright runners until Austin explicitly says **build**.
3. When build is greenlit: launch **one Cloud Agent per epic** (or per parallelisable pair — see epic order), attaching the epic markdown + this file + linked contracts.

### How to launch an epic (Cloud Agent brief)

For each epic in dependency order (`epics/README.md`):

1. **Attach:** `epics/NN-….md`, `epics/README.md`, `epics/UI_SCREEN_SPECS.md` (if UI), `scope/CONTRACTS.md`, `scope/DATA_DICTIONARY.md`, `scope/AUTO_PIPELINE_ON_INSTALL.md` (for pipeline-touching epics), and `scope/CURSOR_TOOLING.md`.
2. **Instruct:** implement Implementation checklist in order; tick Acceptance criteria / DoD; British English; provenance badges; follow pragmatic defaults without clarifying questions.
3. **Prefer Cloud Agent over local greenfield** for first implementation of each epic. Local edits are fine for tiny fixes after an agent lands a slice.
4. **Commits:** use Origin / `origin` CLI / CloudAgent commit flow — not a separate mandatory GH PR ritual for SoT.
5. **Definition of Done:** epic DoD checkboxes + whole-MVP DoD in `epics/README.md` before calling the hackathon demo “done”.

### Epic order (agent-buildable)

```
01 → (02 ∥ 03) → 04 → 05 → (06 ∥ 07) → 08 → 09
```

Epics are written so a Cloud Agent can implement the happy path without asking Austin clarifying questions. Remaining ambiguity → pragmatic defaults in `epics/README.md`.

### What Cloud Agents build (yes)

- Remix Shopify app shell, OAuth, App Bridge routes  
- Prisma schema + SQLite  
- Ingest / catalogue / graph / persona / recommendation services  
- Admin UI (Polaris) matching `ui/` prototypes  
- Playwright runner **code** and job wiring (`agents:run`, PipelineRun workers)  
- Fixtures, Settings, empty/loading/error states  

### What stays custom product logic (Cloud Agents implement it; Cursor does not “provide” it as a product)

These are **Syndicate app responsibilities** — not Cursor platform features:

| Area | Why custom |
|------|------------|
| **Shopify OAuth + session** | Official Remix Shopify template / Admin API |
| **Admin GraphQL ingest** | Orders/products/collections → SQLite |
| **Event catalogue jobs** | football-data.org, Open-Meteo, MOCK seed |
| **Graph + confidence** | SQLite edges + scoring model |
| **Personas / recommender** | Store-backed derivation + P0–P2 cards |
| **PipelineRun workers** | App background jobs (see §3) |
| **Playwright storefront shoppers** | Primary runtime agent runner |

---

## 2) Runtime — prefer Cursor only where it honestly helps

### Product runtime (merchant-facing / demo)

| Capability | MVP choice | Cursor note |
|------------|------------|-------------|
| Embedded app | Remix + App Bridge + Polaris | Built **by** Cloud Agents; runs as Shopify app |
| Persistence | Prisma + SQLite | App DB |
| Pipeline stages a→f | Node workers / job rows | **App workers**, not Cloud Agents |
| Synthetic shoppers | **Playwright** (`npm run agents:run`) | Primary storefront runner |
| Optional future | Cursor Browser Agent / computer-use | **Only if** documented as a real product API — then swap behind the same AgentRun interface; until then note as future, do not plan MVP on it |

### Do not invent

- No “Cursor Commerce API”, “Cursor Shopify connector”, or “Cursor Shopper API” unless Austin points at a real, documented product surface.
- No claiming Cloud Agents will **host** or **execute** merchant PipelineRuns in production.
- MCP connectors (Notion, Slack, Gmail, Calendar, …) Austin already has → **planning notes / coordination only**, not product runtime for Syndicate.

### Future swap (explicit, optional)

If Cursor later ships a **supported** Browser Agent / computer-use API suitable for storefront runs:

- Keep `AgentRun` / Affordance / Insights contracts unchanged.
- Implement an alternate driver behind the same job interface.
- Label runs clearly if the driver differs from Playwright.
- Until that API is documented and available → **Playwright remains primary**.

---

## 3) Critical distinction — Cloud Agents vs PipelineRun workers

| | **Cursor Cloud Agents** | **Syndicate PipelineRun / job workers** |
|--|-------------------------|----------------------------------------|
| **When** | Build / hackathon implementation time | Runtime after merchant install (and Refresh / Run agents) |
| **Who launches** | Austin / build lead on Origin | Remix app after OAuth or Settings CTA |
| **What they do** | Write and commit app code for epics | Execute ingest → graph → personas → Playwright |
| **Merchant PipelineRuns?** | **No** | **Yes** |
| **Playwright storefront?** | May **author** the runner code | **Runs** the shopper (or MOCK replay) |

**One-liner for agents reading AUTO_PIPELINE:**  
*Cloud Agents build the app; they do not run merchant PipelineRuns in production. Pipeline jobs are Syndicate app workers.*

See also: [AUTO_PIPELINE_ON_INSTALL.md](./AUTO_PIPELINE_ON_INSTALL.md) · [SEQUENCE_INSTALL_TO_RECOMMENDATION.md](./SEQUENCE_INSTALL_TO_RECOMMENDATION.md).

---

## 4) Developer experience checklist

- [ ] Plan SoT lives in this Origin-backed docs tree (`epics/` + `scope/` + plans).  
- [ ] Epic slices are Cloud-Agent-attachable (checklist + ACs + fixtures + DoD).  
- [ ] Build launches via **Cursor Cloud Agents on Origin**, not a mandatory parallel GH workflow.  
- [ ] Commits via Origin / CloudAgent / `origin` CLI.  
- [ ] Docs-only until Austin says **build**.  
- [ ] Runtime shoppers = Playwright; Cursor browser path only as labelled future swap.  
- [ ] PipelineRun = app workers ≠ Cloud Agents.  
- [ ] No invented Cursor commerce APIs.  
- [ ] Optional Notion MCP for planning notes only.

---

## 5) Decision cross-ref

- **D28** — Cursor-first build (Cloud Agents on Origin); Playwright stays runtime shopper unless Cursor browser agent becomes a supported swap → [RISKS_AND_DECISIONS.md](./RISKS_AND_DECISIONS.md).  
- Epic launch SOP → [../epics/README.md](../epics/README.md) “Cursor-first build”.  
- Stack note → [../MVP_ARCHITECTURE.md](../MVP_ARCHITECTURE.md) §G.

---

## Out of scope for this doc

- Application / Remix / Prisma source code  
- Claiming unsupported Cursor APIs  
- Replacing Playwright in MVP without a documented Cursor browser product API  
- Using Cloud Agents as the production PipelineRun executor  
