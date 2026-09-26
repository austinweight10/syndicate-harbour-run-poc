"""Simple id helpers (cuid-ish for lab)."""

from __future__ import annotations

import hashlib
import itertools
import time

_counter = itertools.count(1)


def new_id(prefix: str = "id") -> str:
    n = next(_counter)
    raw = f"{prefix}-{time.time_ns()}-{n}"
    return f"{prefix}_{hashlib.sha1(raw.encode()).hexdigest()[:12]}"


def stable_id(prefix: str, *parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]
    return f"{prefix}_{h}"
