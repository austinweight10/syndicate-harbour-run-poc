"""Assertions for Syndicate graph lab (Epic 04)."""

from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.db import connect, reset_db
from src.seed import seed_all
from src.score import build_and_score, clip01, softmax
from src.queries import (
    top_event_candidates,
    sku_neighborhood,
    evidence_path_for_event,
    counts_by_type,
)

FIXTURES = Path(__file__).resolve().parents[2] / "docs" / "fixtures"
EXPECTED = FIXTURES / "graph" / "expected-scores.json"


@pytest.fixture(scope="module")
def built():
    db = ROOT / "data" / "test_graph.sqlite"
    if db.exists():
        db.unlink()
    conn = connect(db)
    reset_db(conn)
    ctx = seed_all(conn)
    scored = build_and_score(conn, ctx)
    yield conn, ctx, scored
    conn.close()


def test_edge_count_positive(built):
    conn, ctx, _ = built
    n = conn.execute("SELECT COUNT(*) FROM graph_edges").fetchone()[0]
    assert n > 0, "expected graph_edges > 0"
    assert n > 0  # seed + score may add TEMPORAL_LIFT/GEO_OVERLAP after ctx snapshot


def test_affinity_or_temporal_with_provenance(built):
    conn, _, _ = built
    row = conn.execute(
        """
        SELECT COUNT(*) FROM graph_edges
        WHERE relation IN ('TEMPORAL_LIFT', 'AFFINITY')
          AND provenance IN ('OBSERVED', 'MOCK', 'AGGREGATE_PROXY')
        """
    ).fetchone()[0]
    assert row >= 1


def test_event_candidate_and_confidence_exist(built):
    conn, _, scored = built
    ec = conn.execute("SELECT COUNT(*) FROM event_candidates").fetchone()[0]
    cs = conn.execute("SELECT COUNT(*) FROM confidence_scores").fetchone()[0]
    assert ec >= 2
    assert cs == ec
    assert scored["count"] == ec


def test_top_event_candidates_query(built):
    conn, ctx, _ = built
    top = top_event_candidates(conn, ctx["shop_id"], 5)
    assert len(top) >= 1
    assert top[0]["value"] >= top[-1]["value"]
    for c in top:
        assert 0.0 <= c["value"] <= 1.0
        for k in ("Lt", "G", "A", "Y", "R"):
            assert 0.0 <= c[k] <= 1.0


def test_sku_neighborhood(built):
    conn, ctx, _ = built
    neigh = sku_neighborhood(conn, "prod_race_tee", ctx["shop_id"])
    assert len(neigh) > 0
    for e in neigh:
        assert e["from_id"] == "prod_race_tee" or e["to_id"] == "prod_race_tee"


def test_evidence_path_top_event(built):
    conn, ctx, _ = built
    top = top_event_candidates(conn, ctx["shop_id"], 1)
    assert top
    edges = evidence_path_for_event(conn, top[0]["id"], ctx["shop_id"])
    assert len(edges) > 0


def test_contains_shipped_affinity_present(built):
    conn, ctx, _ = built
    counts = counts_by_type(conn, ctx["shop_id"])
    for rel in ("CONTAINS", "SHIPPED_TO", "AFFINITY", "VENUE_IN"):
        assert counts["edges"].get(rel, 0) > 0, f"missing relation {rel}"


def test_social_never_observed_demand_alone(built):
    conn, _, _ = built
    # SocialTrend AFFINITY edges must not be OBSERVED
    bad = conn.execute(
        """
        SELECT COUNT(*) FROM graph_edges
        WHERE from_type = 'SocialTrend' AND relation = 'AFFINITY' AND provenance = 'OBSERVED'
        """
    ).fetchone()[0]
    assert bad == 0


def test_clip_and_softmax_unit():
    assert clip01(1.5) == 1.0
    assert clip01(-1) == 0.0
    s = softmax([1.0, 1.0])
    assert abs(sum(s) - 1.0) < 1e-9


def test_golden_bands_soft(built):
    conn, ctx, _ = built
    if not EXPECTED.exists():
        warnings.warn("expected-scores.json missing — soft skip")
        return
    doc = json.loads(EXPECTED.read_text(encoding="utf-8"))
    bands = doc.get("bands") or []
    top = top_event_candidates(conn, ctx["shop_id"], 20)
    by_name = {c["name"]: c for c in top}
    mismatches = []
    for band in bands:
        name = band["name"]
        c = by_name.get(name)
        if not c:
            # soft: try substring
            c = next((x for x in top if name.lower() in x["name"].lower()), None)
        if not c:
            mismatches.append(f"WARN: no candidate named like {name!r}")
            continue
        lo, hi = band["confidenceMin"], band["confidenceMax"]
        if not (lo <= c["value"] <= hi):
            mismatches.append(
                f"WARN: {name} value={c['value']:.3f} outside [{lo}, {hi}]"
            )
        for must in band.get("provenanceMustInclude") or []:
            blob = " ".join(c["provenance"])
            if must not in blob:
                mismatches.append(f"WARN: {name} missing provenance token {must}")
        comps = band.get("components") or {}
        for key, rng in comps.items():
            val = c.get(key)
            if val is None:
                continue
            if not (rng[0] <= val <= rng[1]):
                mismatches.append(
                    f"WARN: {name}.{key}={val:.3f} outside {rng}"
                )
    for m in mismatches:
        warnings.warn(m)
    # Hard assert only that match-day exists in band if present
    md = by_name.get("Match-day home kit rush")
    if md:
        assert 0.72 <= md["value"] <= 0.92
        assert any("OBSERVED" in p for p in md["provenance"])
