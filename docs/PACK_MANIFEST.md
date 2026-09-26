# PACK_MANIFEST — Syndicate SDD weekend pack

**Date:** 24 Sep 2026 · Europe/London
**Tarball:** `/workspace/syndicate-sdd-weekend-pack.tar.gz`

## 15-line summary (Cloud Agent commit message body)

```
docs(sdd): weekend PLAN PACK — kickoff, fixtures, A15 web harvest

- Add AGENT_KICKOFF, BUILD_ORDER, SDD_PLAYBOOK, FIXTURES_MANIFEST
- Lock A5 hybrid, A6 two+stub, A15 watchlist+webHarvest+MOCK
- Rewrite SIGNAL_SOURCES §2.3; add social.webHarvest contract
- Author fixtures/ catalogue, orders, personas, agents, recs, session
- Add epics/PROMPTS/01–09 paste-ready Cloud Agent prompts
- Update AUTO_PIPELINE/SEQUENCE stage c for web harvest (not X keys)
- Raise PLAN_COMPLETENESS fixtures score; remaining Austin: A1/A3/A4/A7
- Docs/fixtures only — no Remix app feature code
- Dual layout: local epics|scope|fixtures|ui + docs/ mirror for Origin
```

## Files in this pack

| Status | Path |
|--------|------|
| NEW | `scope/AGENT_KICKOFF.md` |
| NEW | `scope/BUILD_ORDER.md` |
| NEW | `scope/FIXTURES_MANIFEST.md` |
| NEW | `scope/SDD_PLAYBOOK.md` |
| NEW | `README.md` |
| UPD | `scope/RISKS_AND_DECISIONS.md` |
| UPD | `scope/SIGNAL_SOURCES.md` |
| UPD | `scope/README.md` |
| UPD | `scope/PLAN_COMPLETENESS.md` |
| UPD | `scope/CONTRACTS.md` |
| UPD | `scope/AUTO_PIPELINE_ON_INSTALL.md` |
| UPD | `scope/SEQUENCE_INSTALL_TO_RECOMMENDATION.md` |
| UPD | `epics/README.md` |
| UPD | `epics/03-event-catalogue-job.md` |
| UPD | `epics/05-personas.md` |
| NEW | `epics/PROMPTS/01.md` |
| NEW | `epics/PROMPTS/02.md` |
| NEW | `epics/PROMPTS/03.md` |
| NEW | `epics/PROMPTS/04.md` |
| NEW | `epics/PROMPTS/05.md` |
| NEW | `epics/PROMPTS/06.md` |
| NEW | `epics/PROMPTS/07.md` |
| NEW | `epics/PROMPTS/08.md` |
| NEW | `epics/PROMPTS/09.md` |
| NEW | `fixtures/agents/demo-completed-run.json` |
| NEW | `fixtures/agents/path-football-merch.json` |
| NEW | `fixtures/catalogue/activity-challenges.json` |
| NEW | `fixtures/catalogue/hashtag-watchlist.json` |
| NEW | `fixtures/catalogue/social-trends-mock.json` |
| NEW | `fixtures/catalogue/sports-mock.json` |
| NEW | `fixtures/catalogue/virtual-events-mock.json` |
| NEW | `fixtures/catalogue/web-harvest-allowlist.json` |
| NEW | `fixtures/graph/expected-scores.json` |
| NEW | `fixtures/orders/orders-demo.json` |
| NEW | `fixtures/personas/demo.json` |
| NEW | `fixtures/products/products-demo.json` |
| NEW | `fixtures/recommendations/demo.json` |
| NEW | `fixtures/session/demo-shop.json` |

## Tarball layout

```
cursor-commerce-hackathon/...   # local mirror paths
docs/epics/...
docs/scope/...
docs/fixtures/...
docs/ui/...
docs/README.md                  # root README mirrored
PACK_MANIFEST.md                # this file at tarball root
```

## Remaining thin spots

- `fixtures/catalogue/football-data-pl-sample.json` / Open-Meteo sample (record when keyed)
- `fixtures/ui/*.json` loader stubs (optional; generate at epic 08)
- A1 Partner store, A3 storefront URL, A4 PCD L2, A2 football-data token, A7 judge metric
- No application TypeScript/Remix feature code in this pack (by design)
