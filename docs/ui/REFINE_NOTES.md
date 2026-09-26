# Refine notes v3 — Syndicate HTML Admin

**For:** Austin · weekend pitch polish · 24 Sep 2026 (Europe/London)  
**Scope:** Docs/UI only — no Remix build · local only

## What changed

- **Nav:** Confirmed every page sidenav reads Overview | Events | Personas | **Insights** | Agent runs | Settings — never “Artifacts” (file remains `artifacts.html`).
- **Overview KPIs:** Explicit **Events · Insights · Frictions** cells (Insights = 3 positive; Frictions = 4 problems) — no mixed “INSIGHTS: 4”.
- **Insights board:** Columns labelled **Insights** | **Frictions** (not Resonates | Insights). Subtitle + board hints clarify positive vs problems; fix queue kept.
- **Less “AI-generated” feel:** Fewer stacked badges on cards (score + provenance only); stronger one-line merchant value; quieter compliance footnotes; tighter card hierarchy.
- **Agent runs:** Stop-before-pay banner more prominent; capped auto-queue **≤3** called out clearly.
- **Settings:** New **Recommendation / naming polish** card — Templates (default) · optional OpenAI/Anthropic · Hyp badge · points at `AI_CALL_CONTRACT` (no invented URLs).
- **Events:** Physical / Virtual / Hybrid mode chips kept + denser table with Mode column; quiet London-runner cue on Away-day (run-club café · Victoria Park Half buzz) without rewriting the football fixture path.
- **Personas:** A6 shape intact — Race-day taper Ready, Wet-weather trainer Draft, Anniversary fashion stub parked; lighter tag rows.
- **Visual:** Spacing / type scale / mode-chip / dense-table polish in `styles.css`.

## Shots

`ui/shots/refine-v3/` and `/workspace/syndicate-ui-shots-v3/`:

1. `01-overview.png`
2. `02-events.png`
3. `03-insights.png`
4. `04-personas.png`
5. `05-agent-run.png`
6. `06-settings.png`

## Interaction polish (spec + light CSS) — 24 Sep 2026 evening

- **Specs:** `scope/UI_INTERACTION_CONTRACT.md` (weekend polish bible) + `epics/UI_POLISH_CHECKLIST.md`.
- **CSS:** Added `:focus-visible` rings for `.btn`, `.nav-item`, `.filter-pill`, `.entity-card` (2px navy / primary on green CTAs, offset 2px) and `prefers-reduced-motion` kill-switch for shimmer/toast slide.
- **Shots:** Not re-shot — HTML visual already v3; focus rings are builder/QA aid. Remix will re-verify against Interaction Contract.
