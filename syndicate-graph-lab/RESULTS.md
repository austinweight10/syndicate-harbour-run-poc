# Syndicate graph lab — RESULTS

**Generated:** 24 Sep 2026 · Europe/London (BST)  
**Shop:** `shop_harbour_run_demo` · `harbour-run-demo.myshopify.com`  
**DB:** `syndicate-graph-lab/data/graph.sqlite`  
**Fixtures:** `docs/fixtures/` (Harbour Run orders/products plus the mixed catalogue, including deprecated Premier League mocks)

## Pipeline status

| Step | Result |
|------|--------|
| Schema (`graph_edges`, `event_candidates`, `confidence_scores`, `nodes`) | OK |
| Seed from fixtures | OK |
| Score EventCandidates | OK |
| `pytest` | **10 passed** |
| Demo report | `out/demo-report.txt` |

## Counts

| Entity | Count |
|--------|------:|
| Nodes | 130 |
| Graph edges | **395** |
| EventCandidates | 7 |
| ConfidenceScores | 7 |

### Nodes by type

| Type | Count |
|------|------:|
| Order | 48 |
| SKU | 20 |
| Event | 13 |
| HashtagWatch | 12 |
| Geo | 7 |
| EventCandidate | 7 |
| SocialTrend | 6 |
| VirtualEvent | 5 |
| Collection | 4 |
| Persona | 3 |
| ActivityChallenge | 3 |
| Shop | 1 |
| Driver | 1 |

### Edges by relation

| Relation | Count |
|----------|------:|
| CONTAINS | 159 |
| AFFINITY | 130 |
| SHIPPED_TO | 48 |
| VENUE_IN | 17 |
| AMPLIFIES | 11 |
| TRENDING_IN | 9 |
| GOALS_INCLUDE | 9 |
| TEMPORAL_LIFT | 7 |
| GEO_OVERLAP | 4 |
| DRIVEN_BY | 1 |

## Top EventCandidates (by confidence)

The scorer still ranks the deprecated Premier League mock first when those rows remain in `sports-mock.json`. Race weekend is the running candidate.

| Rank | Name | value | Lt | G | A | Y | R | n_orders | Provenance (abbrev.) |
|-----:|------|------:|---:|--:|--:|--:|--:|---------:|----------------------|
| 1 | Match-day home kit rush | **0.87** | 1.00 | 1.00 | 0.78 | 0.50 | 0.79 | 48 | OBSERVED orders · MOCK fixtures · AGGREGATE_PROXY hashtag buzz |
| 2 | Race weekend — London 10K | **0.81** | 1.00 | 1.00 | 0.50 | 0.50 | 0.83 | 5 | MOCK race calendar · OBSERVED orders |
| 3 | Wet weekend layers | **0.58** | 0.60 | 0.50 | 0.55 | 0.50 | 0.85 | 8 | AGGREGATE_PROXY weather driver · MOCK synthetic · OBSERVED orders |
| 4 | Hyrox-style meet | 0.47 | 0.50 | 0.30 | 0.45 | 0.50 | 0.85 | 10 | MOCK · AGGREGATE_PROXY hashtag buzz |
| 5 | Sofa-to-5K virtual | 0.38 | 0.00 | 0.35 | 0.40 | 0.50 | 0.85 | 2 | MOCK virtual · MODEL HYPOTHESIS (low n) |

Golden bands (`fixtures/graph/expected-scores.json`): match-day ∈ [0.72, 0.92] ✓ · wet ∈ [0.45, 0.75] ✓ · sofa ∈ [0.35, 0.65] ✓ · hyrox ∈ [0.30, 0.60] ✓

## Sample queries

### 1. Top EventCandidates by confidence

```sql
SELECT ec.name, cs.value, cs.Lt, cs.G, cs.A, cs.Y, cs.R, cs.provenance_labels_json
FROM event_candidates ec
JOIN confidence_scores cs ON cs.event_candidate_id = ec.id
WHERE ec.shop_id = 'shop_harbour_run_demo'
ORDER BY cs.value DESC;
```

### 2. Neighbourhood of SKU `prod_race_tee` (1-hop)

38 edges — primarily `CONTAINS` ← Orders (OBSERVED) and `AFFINITY` → catalogue Events (MOCK / AGGREGATE_PROXY).

### 3. Evidence path (shared London geo)

**Order → Geo ← Event**

1. `#1001` --SHIPPED_TO--> London (OBSERVED)  
2. Hyde Park 5K & 10K (RunThrough) --VENUE_IN--> London (AGGREGATE_PROXY)

Plus EventCandidate `TEMPORAL_LIFT` / `GEO_OVERLAP`, SKU `AFFINITY`, SocialTrend `AMPLIFIES`, Persona `PERSONA_OF`.

## Notes / constraints honoured

- SQLite only — **no Neo4j**  
- Weather fixture absent → **no `FORECAST_FOR` / OBSERVED weather forecast**; synthetic MOCK wet Driver for demo scoring only  
- SocialTrend `AFFINITY` provenance is **AGGREGATE_PROXY** — never OBSERVED demand from social alone  
- \(Y = 0.5\) prior-year neutral on all scores  
- Low-n cap applied (Sofa-to-5K at 0.38 with hypothesis label)

## Re-run

```bash
cd syndicate-graph-lab
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build_and_score.py
.venv/bin/python demo.py
.venv/bin/python -m pytest -q
```
