#!/usr/bin/env python3
"""CLI: reset DB, seed from fixtures, score EventCandidates."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from src.db import connect, reset_db, DEFAULT_DB
from src.seed import seed_all
from src.score import build_and_score
from src.queries import top_event_candidates, counts_by_type


def main() -> int:
    ap = argparse.ArgumentParser(description="Build Syndicate SQLite graph + score candidates")
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()

    conn = connect(args.db)
    reset_db(conn)
    ctx = seed_all(conn)
    result = build_and_score(conn, ctx)
    counts = counts_by_type(conn, ctx["shop_id"])
    top = top_event_candidates(conn, ctx["shop_id"], 5)

    summary = {
        "shop_id": ctx["shop_id"],
        "domain": ctx["domain"],
        "nodes": ctx["nodes"],
        "edges": ctx["edges"],
        "edges_by_relation": ctx["edges_by_relation"],
        "candidates": result["count"],
        "top": top,
        "notes": ctx["notes"],
        "db": str(args.db),
    }
    print(json.dumps(summary, indent=2))
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
