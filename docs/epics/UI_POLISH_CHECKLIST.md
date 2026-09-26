# UI Polish Checklist — weekend QA (printable)

**Product:** Syndicate · Epic 08/09 DoD companion  
**Authority:** `scope/UI_INTERACTION_CONTRACT.md` (do not invent hover/toast/banner copy)  
**Date:** 24 Sep 2026 · Europe/London · British English  
**How to use:** Print or keep one tab open. Tick during Phase 5 dry-run. Force empty/error via fixture flags (`DEMO_FIXTURES`, failed SyncRun, `agentsAutoRun=false`, missing storefrontUrl).

---

## Global chrome

- [ ] Canvas `#f3f0eb` · surfaces `#ffffff` · charcoal top bar · kit stripe visible
- [ ] Green `#008060` only on primary CTAs (Run agents, Retry, Confirm, Resume)
- [ ] Kit-red only on Frictions accents / critical / kit stripe — not Insights decoration
- [ ] Left nav: Overview · Events · Personas · **Insights** · Agent runs · Settings (never “Artifacts”)
- [ ] Connected pill + shop domain in top bar
- [ ] Focus-visible rings present on `.btn`, nav, filter pills, entity cards (2px navy/primary, offset 2px)
- [ ] Hover transitions ≤160ms ease; no bounce/spring
- [ ] `prefers-reduced-motion: reduce` → no skeleton shimmer / no confidence width animate

## Toasts (trigger each)

- [ ] **T01** Run agents → “Agents queued — watching your storefront as {persona}.” (+ optional View run)
- [ ] **T02** Run again at cap → “Agents already running…”
- [ ] **T03** Pause ON → “Auto agents paused for this shop.”
- [ ] **T04** Pause OFF → “Auto agents resumed (capped queue).”
- [ ] **T05** Confirm Refresh store → “Refresh store queued…”
- [ ] **T06** Resume pipeline → “Pipeline resumed from {stage}.”
- [ ] **T07** Sync retry → “Sync retry queued.”
- [ ] **T08** Forced failure → “Action failed — try again in a moment.”
- [ ] **T09** (if MVP dismiss) Recommendation dismissed
- [ ] **T11/T12** Missing storefront / no Ready persona messages when applicable

## Banners (force via fixtures)

- [ ] **B01** HTTP 429 + Retry / Dismiss
- [ ] **B02** Pipeline failed at stage X + Resume
- [ ] **B03** Zero orders empty guidance
- [ ] **B04** Agents paused info
- [ ] **B05** Stop-before-pay on Agent runs **and** Insights
- [ ] **B06** Storefront URL missing
- [ ] **B07** LLM templates quiet note on Settings (not critical Banner)
- [ ] **B08** Degraded catalogue warning

## Per-screen smoke (click every CTA)

### Overview `/app`
- [ ] Labels → EnrichmentLegendModal (Obs/Agg/Hyp/Mock sports bullets)
- [ ] Run agents → toast → optional navigate runs
- [ ] Hero + secondary event cards navigate; hover lift works
- [ ] KPI strip: Events · Insights · Frictions (three cells)
- [ ] Loading skeletons then content (no empty flash)
- [ ] Empty zero-order path (fixture) shows B03 / EmptyState

### Events `/app/events`
- [ ] Filter pills toggle active state
- [ ] Mode chips Physical / Virtual / Hybrid visible
- [ ] Provenance chip tooltip + aria-label
- [ ] Card + table row → event detail
- [ ] Confidence bar tooltip / valuetext
- [ ] Empty + error banners per contract

### Event detail `/app/events/:id`
- [ ] Tabs Signals / Catalogue / Personas switch panels
- [ ] Active tab underline kit-red
- [ ] Run agents preselects linked Ready personas
- [ ] 404 path: Event not found + back

### Personas `/app/personas`
- [ ] Ready / Draft navigate; stub does **not** (opacity ~0.55, tooltip “Parked for this weekend”)
- [ ] Empty / loading skeletons

### Persona detail `/app/personas/:id`
- [ ] Run agents enqueues this persona
- [ ] Prior runs → run detail
- [ ] Empty prior-runs copy

### Insights `/app/artifacts` (nav label Insights)
- [ ] H1 Insights; columns **Insights \| Frictions**
- [ ] Export brief → ExportNotWiredModal (not silent)
- [ ] P0–P2 cards + stop-before-pay banner B05
- [ ] Empty board CTA to runs
- [ ] Frictions left border kit-red; Insights quieter (no green flood)

### Agent runs `/app/runs` · `/app/runs/:id`
- [ ] Run agents CTA; progress %; timeline ≥5 steps on demo
- [ ] Outcome shows stop-before-payment language
- [ ] Polling live region polite while running
- [ ] Failed run critical Banner
- [ ] Idle empty copy when no runs

### Settings `/app/settings`
- [ ] Pause toggle **instant** (no confirm) + T03/T04
- [ ] Refresh store → **ConfirmRefreshStoreModal** → T05
- [ ] Re-scan disabled shows “Syncing…” while running
- [ ] Pipeline checklist + Resume on failure
- [ ] LLM polish card: Templates default (B07 quiet)
- [ ] Empty sync rules EmptyState
- [ ] Playground: LoadingExampleModal + Error429Modal (if flag)
- [ ] No access token strings in HTML

## A11y spot-check

- [ ] Esc closes modal; focus returns to trigger
- [ ] Enter activates focused primary button
- [ ] Icon-only Labels / Close have aria-labels
- [ ] Colour not sole signal on badges
- [ ] Tab order sane with App Bridge (title actions before deep content)

## Demo roll-up

- [ ] Journey A: Overview → Event → Persona narratable
- [ ] Journey B: Run → timeline → Insights / Frictions fixes
- [ ] Journey C: Labels modal ethical framing
- [ ] British English QA (no US spellings)
- [ ] `UI_INTERACTION_CONTRACT.md` §L items L01–L30 considered covered by ticks above

---

**Pass rule:** All Global + Toasts T01–T08 + Banners B01/B05/B07 + every screen smoke row + A11y spot-check. Remaining banners/toasts: force once before pitch if time.

**Fail → fix before calling Epic 08/09 done.**
