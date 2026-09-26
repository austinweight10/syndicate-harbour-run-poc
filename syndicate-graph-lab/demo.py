#!/usr/bin/env python3
"""British English demo summary for the Syndicate graph lab."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from src.db import connect, reset_db, DEFAULT_DB
from src.seed import seed_all
from src.score import build_and_score
from src.queries import (
    top_event_candidates,
    counts_by_type,
    sample_order_geo_event_path,
    evidence_path_for_event,
    sku_neighborhood,
)


def main() -> int:
    out_dir = ROOT / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "demo-report.txt"

    conn = connect(DEFAULT_DB)
    reset_db(conn)
    ctx = seed_all(conn)
    scored = build_and_score(conn, ctx)
    shop_id = ctx["shop_id"]
    counts = counts_by_type(conn, shop_id)
    top = top_event_candidates(conn, shop_id, 3)
    path = sample_order_geo_event_path(conn, shop_id)

    lines: list[str] = []
    lines.append("Syndicate graph lab — demo report")
    lines.append("=================================")
    lines.append(f"Shop: {ctx['domain']} ({shop_id})")
    lines.append(f"Database: {DEFAULT_DB}")
    lines.append("")
    lines.append("Node counts by type")
    lines.append("-------------------")
    for k, v in sorted(counts["nodes"].items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"  {k:22} {v}")
    lines.append(f"  {'TOTAL':22} {sum(counts['nodes'].values())}")
    lines.append("")
    lines.append("Edge counts by relation")
    lines.append("-----------------------")
    for k, v in sorted(counts["edges"].items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"  {k:22} {v}")
    lines.append(f"  {'TOTAL':22} {sum(counts['edges'].values())}")
    lines.append("")
    lines.append("Top 3 EventCandidates (confidence + provenance)")
    lines.append("-----------------------------------------------")
    for i, c in enumerate(top, 1):
        labels = " · ".join(c["provenance"])
        lines.append(
            f"  {i}. {c['name']}  ·  {c['value']:.2f} ({c['value_pct']:.0f}%)  ·  "
            f"Lt={c['Lt']:.2f} G={c['G']:.2f} A={c['A']:.2f} Y={c['Y']:.2f} R={c['R']:.2f}"
        )
        lines.append(f"     n_orders={c['n_orders']}  venue={c['venue_city'] or '—'}  [{labels}]")
    lines.append("")
    lines.append("Sample evidence path: Order → Geo ← Event")
    lines.append("-----------------------------------------")
    if path:
        for step in path:
            lines.append(
                f"  {step['step']}. {step['from']}  --{step['relation']}-->  {step['to']}  "
                f"({step['provenance']})"
            )
        lines.append("  (Shared Geo links ship-to orders with catalogue venue.)")
    else:
        lines.append("  (No shared Order→Geo←Event path found.)")

    if top:
        lines.append("")
        lines.append(f"Evidence edges touching top candidate “{top[0]['name']}”")
        lines.append("----------------------------------------------------")
        ev_edges = evidence_path_for_event(conn, top[0]["id"], shop_id)
        for e in ev_edges[:12]:
            lines.append(
                f"  {e['from_type']}:{e['from_id'][:40]}  --{e['relation']}-->  "
                f"{e['to_type']}:{e['to_id'][:40]}  w={e['weight']:.2f}  {e['provenance']}"
            )
        if len(ev_edges) > 12:
            lines.append(f"  … +{len(ev_edges) - 12} more")

        # SKU neighbourhood sample
        lines.append("")
        lines.append("Sample SKU neighbourhood (prod_race_tee, 1-hop)")
        lines.append("------------------------------------------------------")
        neigh = sku_neighborhood(conn, "prod_race_tee", shop_id)
        for e in neigh[:10]:
            other = (
                f"{e['to_type']}:{e['to_id']}"
                if e["from_id"] == "prod_race_tee"
                else f"{e['from_type']}:{e['from_id']}"
            )
            lines.append(f"  {e['relation']:16} {other[:50]}  ({e['provenance']}, w={e['weight']:.2f})")
        lines.append(f"  ({len(neigh)} edges total)")

    lines.append("")
    lines.append("Notes")
    lines.append("-----")
    for n in ctx["notes"]:
        lines.append(f"  • {n}")
    lines.append("  • Social/activity buzz never upgrades demand provenance to OBSERVED alone.")
    lines.append("  • Prior-year component Y defaults to 0.5 (neutral).")
    lines.append("")

    text = "\n".join(lines) + "\n"
    report_path.write_text(text, encoding="utf-8")
    print(text)
    print(f"[wrote {report_path}]")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
