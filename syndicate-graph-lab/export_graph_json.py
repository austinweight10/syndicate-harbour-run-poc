#!/usr/bin/env python3
"""Export Syndicate graph SQLite → JSON for the interactive viz.

Reads data/graph.sqlite, writes:
  data/graph-viz.json          full graph for the browser explorer
  data/graph-viz-summary.json  top events + relation histogram (README-friendly)
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "graph.sqlite"
OUT_FULL = ROOT / "data" / "graph-viz.json"
OUT_SUMMARY = ROOT / "data" / "graph-viz-summary.json"
LONDON = ZoneInfo("Europe/London")


def _parse_json(raw: str | None):
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def load_or_build() -> sqlite3.Connection:
    if not DB_PATH.exists():
        import subprocess
        import sys

        print(f"DB missing at {DB_PATH}; running build_and_score.py …")
        subprocess.check_call([sys.executable, str(ROOT / "build_and_score.py")], cwd=str(ROOT))
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def export(conn: sqlite3.Connection) -> tuple[dict, dict]:
    cur = conn.cursor()

    shop_rows = cur.execute("SELECT DISTINCT shop_id FROM nodes").fetchall()
    shop_id = shop_rows[0]["shop_id"] if shop_rows else "shop_demo_harbour"

    shop_label_row = cur.execute(
        "SELECT label FROM nodes WHERE id = ? OR node_type = 'Shop' LIMIT 1",
        (shop_id,),
    ).fetchone()
    shop_label = shop_label_row["label"] if shop_label_row else "Harbour Athletic"

    nodes: list[dict] = []
    node_ids: set[str] = set()
    type_counts: dict[str, int] = {}

    for r in cur.execute(
        "SELECT id, shop_id, node_type, label, payload_json FROM nodes ORDER BY node_type, label"
    ):
        payload = _parse_json(r["payload_json"])
        node = {
            "id": r["id"],
            "type": r["node_type"],
            "label": r["label"] or r["id"],
        }
        if payload is not None:
            node["payload"] = payload
        nodes.append(node)
        node_ids.add(r["id"])
        type_counts[r["node_type"]] = type_counts.get(r["node_type"], 0) + 1

    edges: list[dict] = []
    relation_hist: dict[str, int] = {}
    provenance_hist: dict[str, int] = {}
    missing_endpoints: dict[str, tuple[str, str]] = {}  # id -> (type, role hint)

    for r in cur.execute(
        """SELECT id, from_type, from_id, to_type, to_id, relation, weight, provenance, payload_json
           FROM graph_edges ORDER BY relation, id"""
    ):
        edges.append(
            {
                "id": r["id"],
                "source": r["from_id"],
                "target": r["to_id"],
                "relation": r["relation"],
                "weight": float(r["weight"] or 1.0),
                "provenance": r["provenance"],
                "from_type": r["from_type"],
                "to_type": r["to_type"],
            }
        )
        relation_hist[r["relation"]] = relation_hist.get(r["relation"], 0) + 1
        provenance_hist[r["provenance"]] = provenance_hist.get(r["provenance"], 0) + 1
        if r["from_id"] not in node_ids:
            missing_endpoints[r["from_id"]] = (r["from_type"], "from")
        if r["to_id"] not in node_ids:
            missing_endpoints[r["to_id"]] = (r["to_type"], "to")

    # Synthesise placeholder nodes so the graph is complete
    for eid, (etype, _role) in sorted(missing_endpoints.items()):
        if ":" in eid:
            parts = eid.split(":")
            # mock:weather:wet_weekend:demo → "weather wet weekend"
            label = " ".join(parts[1:-1] if len(parts) > 2 else parts[1:]).replace("_", " ") or eid
        else:
            label = eid
        nodes.append(
            {
                "id": eid,
                "type": etype,
                "label": f"{label.title()} (synthesised)",
                "payload": {"synthesised": True, "reason": "edge endpoint missing from nodes table"},
            }
        )
        node_ids.add(eid)
        type_counts[etype] = type_counts.get(etype, 0) + 1
        print(f"  synthesised placeholder node: {eid} ({etype})")

    # EventCandidates joined with confidence
    events: list[dict] = []
    for r in cur.execute(
        """
        SELECT ec.id, ec.name, ec.archetype, ec.catalogue_event_id,
               ec.time_start, ec.time_end, ec.venue_city, ec.venue_country,
               ec.enrichment_source, ec.window_label,
               cs.value, cs.value_pct, cs.Lt, cs.G, cs.A, cs.Y, cs.R,
               cs.n_orders, cs.provenance_labels_json,
               cs.baseline_pct, cs.window_start, cs.window_end
        FROM event_candidates ec
        LEFT JOIN confidence_scores cs ON cs.event_candidate_id = ec.id
        WHERE ec.shop_id = ?
        ORDER BY COALESCE(cs.value, 0) DESC
        """,
        (shop_id,),
    ):
        labels = _parse_json(r["provenance_labels_json"]) or []
        events.append(
            {
                "id": r["id"],
                "name": r["name"],
                "archetype": r["archetype"],
                "catalogue_event_id": r["catalogue_event_id"],
                "time_start": r["time_start"],
                "time_end": r["time_end"],
                "venue_city": r["venue_city"],
                "venue_country": r["venue_country"],
                "enrichment_source": r["enrichment_source"],
                "window_label": r["window_label"],
                "confidence": {
                    "value": float(r["value"]) if r["value"] is not None else None,
                    "value_pct": float(r["value_pct"]) if r["value_pct"] is not None else None,
                    "Lt": float(r["Lt"]) if r["Lt"] is not None else None,
                    "G": float(r["G"]) if r["G"] is not None else None,
                    "A": float(r["A"]) if r["A"] is not None else None,
                    "Y": float(r["Y"]) if r["Y"] is not None else None,
                    "R": float(r["R"]) if r["R"] is not None else None,
                    "baseline_pct": float(r["baseline_pct"]) if r["baseline_pct"] is not None else None,
                },
                "n_orders": int(r["n_orders"] or 0),
                "provenance_labels": labels,
                "window_start": r["window_start"],
                "window_end": r["window_end"],
            }
        )

    # Match-day evidence path helpers for the viz preset
    top_match = next((e for e in events if e.get("archetype") == "match_day"), events[0] if events else None)
    matchday_path = {
        "event_candidate_id": top_match["id"] if top_match else None,
        "name": top_match["name"] if top_match else None,
        "relations": [
            "SHIPPED_TO",
            "VENUE_IN",
            "TEMPORAL_LIFT",
            "GEO_OVERLAP",
            "AFFINITY",
            "AMPLIFIES",
            "PERSONA_OF",
        ],
        "seed_node_ids": [],
        "notes": "Order → Geo ← Event plus TEMPORAL_LIFT / AFFINITY / AMPLIFIES / PERSONA_OF around top Match-day EC",
    }
    if top_match:
        seeds = {top_match["id"]}
        # Pull 1-hop + key catalogue event + Manchester geo + home shirt + persona
        for r in cur.execute(
            """SELECT from_id, to_id, relation FROM graph_edges
               WHERE from_id = ? OR to_id = ?""",
            (top_match["id"], top_match["id"]),
        ):
            seeds.add(r["from_id"])
            seeds.add(r["to_id"])
        # Explicit path anchors from RESULTS.md
        for nid in (
            "geo_96d08e3d791b6f4d",  # Manchester
            "mock:pl:mufc-liverpool:2026-09-27",
            "prod_home_shirt_2526",
            "pers_away_day_dad",
            "st_8f1ea3ad3dc03ea0",  # #MatchDay
            "ord_demo_001",
        ):
            if nid in node_ids:
                seeds.add(nid)
        matchday_path["seed_node_ids"] = sorted(seeds)

    now = datetime.now(LONDON)
    meta = {
        "shop_id": shop_id,
        "shop_label": shop_label,
        "generated_at": now.isoformat(),
        "generated_at_label": now.strftime("%d %b %Y · %H:%M %Z"),
        "counts": {
            "nodes": len(nodes),
            "edges": len(edges),
            "events": len(events),
            "synthesised_nodes": len(missing_endpoints),
        },
        "node_types": dict(sorted(type_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "relations": dict(sorted(relation_hist.items(), key=lambda kv: (-kv[1], kv[0]))),
        "provenances": dict(sorted(provenance_hist.items(), key=lambda kv: (-kv[1], kv[0]))),
        "matchday_path": matchday_path,
        "source_db": "syndicate-graph-lab/data/graph.sqlite",
    }

    full = {"meta": meta, "nodes": nodes, "edges": edges, "events": events}

    summary = {
        "meta": {
            "shop_id": shop_id,
            "shop_label": shop_label,
            "generated_at": meta["generated_at"],
            "generated_at_label": meta["generated_at_label"],
            "counts": meta["counts"],
        },
        "top_events": [
            {
                "id": e["id"],
                "name": e["name"],
                "archetype": e["archetype"],
                "value": e["confidence"]["value"],
                "Lt": e["confidence"]["Lt"],
                "G": e["confidence"]["G"],
                "A": e["confidence"]["A"],
                "Y": e["confidence"]["Y"],
                "R": e["confidence"]["R"],
                "n_orders": e["n_orders"],
                "provenance_labels": e["provenance_labels"],
            }
            for e in events[:5]
        ],
        "relation_histogram": meta["relations"],
        "provenance_histogram": meta["provenances"],
        "node_type_histogram": meta["node_types"],
        "matchday_path": matchday_path,
    }
    return full, summary


def main() -> None:
    conn = load_or_build()
    try:
        full, summary = export(conn)
    finally:
        conn.close()

    OUT_FULL.parent.mkdir(parents=True, exist_ok=True)
    OUT_FULL.write_text(json.dumps(full, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_SUMMARY.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    c = full["meta"]["counts"]
    print(f"Wrote {OUT_FULL}")
    print(f"Wrote {OUT_SUMMARY}")
    print(
        f"nodes={c['nodes']} edges={c['edges']} events={c['events']} "
        f"synthesised={c['synthesised_nodes']}"
    )


if __name__ == "__main__":
    main()
