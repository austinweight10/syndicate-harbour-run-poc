# SDD_PLAYBOOK — spec-driven development with Cursor Cloud Agents

**Date:** 24 Sep 2026 · Europe/London  
**Companion:** [AGENT_KICKOFF.md](./AGENT_KICKOFF.md) · [BUILD_ORDER.md](./BUILD_ORDER.md) · `epics/PROMPTS/`

---

## Rules of engagement

1. **One epic = one PR-sized Cloud Agent.** Do not merge 02+03+04 in one agent unless BUILD_ORDER says parallel pair.
2. **Specs are law.** Product behaviour comes from epics + scope. Open questions → pragmatic defaults. Do **not** invent verticals, scopes, or social scrapers.
3. **Fixtures first.** Prefer `fixtures/` over hallucinated seed data.
4. **AC checkbox discipline.** Tick every Acceptance criterion in the epic before marking Done.
5. **Docs-only until greenlit.** When Austin says build, start at AGENT_KICKOFF → BUILD_ORDER Phase 0/1.
6. **Cloud Agents BUILD; Playwright shops; PipelineRun is in-app.** Never treat a Cloud Agent session as a merchant PipelineRun.

---

## Branch naming

```
epic/01-oauth-shell
epic/02-shopify-ingest
epic/03-event-catalogue
epic/04-graph-confidence
epic/05-personas
epic/06-synthetic-agents
epic/07-recommendations
epic/08-admin-ui
epic/09-settings-states
chore/phase0-prisma-fixtures   # optional Phase 0
```

---

## Commit message conventions

```
epic(01): OAuth shell + DEMO_FIXTURE_SHOP session

- Scopes read_orders,read_products,read_customers only
- Fixture shop domain demo-football-merch.myshopify.com

AC: install Connected pill; no write_* scopes
```

Prefixes: `epic(NN):` · `fix:` · `docs:` · `chore:` · `test:`.  
Reference decision IDs when relevant (`A5 hybrid`, `A15 webHarvest`).

---

## Prompt template (copy-paste)

```
You are implementing Syndicate epic {NN} on Origin.

GOAL
{one paragraph from epics/PROMPTS/NN.md}

ATTACH (read fully before coding)
- docs/epics/{epic-file}.md   (or epics/… on local mirror)
- docs/epics/PROMPTS/{NN}.md
- docs/scope/AGENT_KICKOFF.md
- docs/scope/CONTRACTS.md
- {extra paths from PROMPTS attach list}
- docs/fixtures/… as listed

LOCKED DEFAULTS (do not reopen)
- A5 hybrid (≥20 orders → live; else fixtures)
- A6 two personas + fashion stub (runner stretch optional)
- A15 social: watchlist + social.webHarvest allowlist + MOCK — no unofficial X scrape
- A13 no nightly schedule; A14 agents default ON capped; A16 Strava curated/MOCK default

DEFINITION OF DONE
- All Acceptance criteria checkboxes in the epic
- British English UI strings
- Provenance labels on enrichment
- No parkrun live fetch; no twitter.com/x.com hard-dep scrapes

FORBIDDEN
- Feature work outside this epic
- write_* Shopify scopes, wealth APIs, Neo4j, completing payment
- Inventing product behaviour not in Open questions / pragmatic defaults

COMMIT
- Branch: epic/{NN}-{slug}
- Message per SDD_PLAYBOOK conventions
- List assumptions in PR body
```

Ready-made prompts: `epics/PROMPTS/01.md` … `09.md`.

---

## Required attach list (minimum every epic)

- Target epic markdown  
- Matching `epics/PROMPTS/0N.md`  
- `scope/AGENT_KICKOFF.md`  
- `epics/README.md` (pragmatic defaults)  
- Plus CONTRACTS / SIGNAL_SOURCES / fixtures per AGENT_KICKOFF table  

---

## AC checkbox discipline

1. Copy the epic’s Acceptance criteria into the PR description as a checklist.  
2. Do not close the agent until every box is evidenced (test output, screenshot note, or seed assert).  
3. If blocked on A1/A3/A4/secrets → stop and escalate; otherwise use defaults.

---

## No inventing product behaviour

Allowed without Austin:

- Pragmatic defaults in `epics/README.md`  
- Locked A5/A6/A13/A14/A15/A16  
- Implementation choices that do not change merchant-visible product (file layout, queue library)

Not allowed:

- New OAuth scopes, live parkrun scrape, unofficial X HTML scrapes, third DoD persona, nightly cron, wealth signals, auto theme writebacks
