"""Read queries for EventCandidates, neighbourhood, evidence paths."""

from __future__ import annotations

import json
import sqlite3


def top_event_candidates(conn: sqlite3.Connection, shop_id: str, limit: int = 10) -> list[dict]:
    rows = conn.execute(
        """
        SELECT ec.id, ec.name, ec.archetype, ec.n_orders, ec.venue_city, ec.catalogue_event_id,
               cs.value, cs.value_pct, cs.Lt, cs.G, cs.A, cs.Y, cs.R,
               cs.provenance_labels_json, cs.baseline_pct
        FROM event_candidates ec
        JOIN confidence_scores cs ON cs.event_candidate_id = ec.id
        WHERE ec.shop_id = ?
        ORDER BY cs.value DESC
        LIMIT ?
        """,
        (shop_id, limit),
    ).fetchall()
    out = []
    for r in rows:
        out.append({
            "id": r["id"],
            "name": r["name"],
            "archetype": r["archetype"],
            "n_orders": r["n_orders"],
            "venue_city": r["venue_city"],
            "catalogue_event_id": r["catalogue_event_id"],
            "value": r["value"],
            "value_pct": r["value_pct"],
            "Lt": r["Lt"],
            "G": r["G"],
            "A": r["A"],
            "Y": r["Y"],
            "R": r["R"],
            "baseline_pct": r["baseline_pct"],
            "provenance": json.loads(r["provenance_labels_json"]),
        })
    return out


def sku_neighborhood(conn: sqlite3.Connection, sku_id: str, shop_id: str | None = None) -> list[dict]:
    q = """
        SELECT id, from_type, from_id, to_type, to_id, relation, weight, provenance, payload_json
        FROM graph_edges
        WHERE (from_type = 'SKU' AND from_id = ?) OR (to_type = 'SKU' AND to_id = ?)
    """
    params: list = [sku_id, sku_id]
    if shop_id:
        q += " AND shop_id = ?"
        params.append(shop_id)
    q += " ORDER BY weight DESC"
    rows = conn.execute(q, params).fetchall()
    return [dict(r) for r in rows]


def evidence_path_for_event(conn: sqlite3.Connection, event_candidate_id: str, shop_id: str) -> list[dict]:
    """Edges touching the EventCandidate, its catalogue event, and linked geos/orders sample."""
    ec = conn.execute(
        "SELECT * FROM event_candidates WHERE id = ?", (event_candidate_id,)
    ).fetchone()
    if not ec:
        return []
    cat_id = ec["catalogue_event_id"]
    rows = conn.execute(
        """
        SELECT * FROM graph_edges
        WHERE shop_id = ? AND (
          (from_type = 'EventCandidate' AND from_id = ?)
          OR (to_type = 'EventCandidate' AND to_id = ?)
          OR (from_type = 'Event' AND from_id = ?)
          OR (to_type = 'Event' AND to_id = ?)
        )
        ORDER BY relation, weight DESC
        """,
        (shop_id, event_candidate_id, event_candidate_id, cat_id or "", cat_id or ""),
    ).fetchall()
    return [dict(r) for r in rows]


def counts_by_type(conn: sqlite3.Connection, shop_id: str) -> dict:
    nodes = {
        r["node_type"]: r["c"]
        for r in conn.execute(
            "SELECT node_type, COUNT(*) AS c FROM nodes WHERE shop_id = ? GROUP BY node_type",
            (shop_id,),
        )
    }
    edges = {
        r["relation"]: r["c"]
        for r in conn.execute(
            "SELECT relation, COUNT(*) AS c FROM graph_edges WHERE shop_id = ? GROUP BY relation ORDER BY c DESC",
            (shop_id,),
        )
    }
    return {"nodes": nodes, "edges": edges}


def sample_order_geo_event_path(conn: sqlite3.Connection, shop_id: str) -> list[dict] | None:
    """Find Order → Geo ← Event path (shared geo)."""
    row = conn.execute(
        """
        SELECT o.from_id AS order_id, o.to_id AS geo_id, e.from_id AS event_id,
               o.provenance AS order_prov, e.provenance AS event_prov,
               n_geo.label AS geo_label, n_ev.label AS event_label, n_ord.label AS order_label
        FROM graph_edges o
        JOIN graph_edges e
          ON e.to_id = o.to_id AND e.to_type = 'Geo' AND e.relation = 'VENUE_IN' AND e.shop_id = o.shop_id
        LEFT JOIN nodes n_geo ON n_geo.id = o.to_id
        LEFT JOIN nodes n_ev ON n_ev.id = e.from_id
        LEFT JOIN nodes n_ord ON n_ord.id = o.from_id
        WHERE o.shop_id = ? AND o.relation = 'SHIPPED_TO' AND o.from_type = 'Order'
        LIMIT 1
        """,
        (shop_id,),
    ).fetchone()
    if not row:
        return None
    return [
        {"step": 1, "from": row["order_label"] or row["order_id"], "relation": "SHIPPED_TO",
         "to": row["geo_label"] or row["geo_id"], "provenance": row["order_prov"]},
        {"step": 2, "from": row["event_label"] or row["event_id"], "relation": "VENUE_IN",
         "to": row["geo_label"] or row["geo_id"], "provenance": row["event_prov"]},
    ]
