# UI Interaction Contract — weekend polish bible

**Product:** Syndicate · Shopify Admin embed (sports / athleisure)  
**Date:** 24 Sep 2026 · Europe/London (BST)  
**Locale:** British English throughout  
**Status:** SPEC — implement in epics 08/09 when Austin says **build**. No Remix code in this pass.

---

## A. Purpose & authority

| Layer | Source of truth |
|-------|-----------------|
| **Visual** | `ui/*.html` + `ui/styles.css` + `ui/shots/refine-v3/` |
| **IA / naming (D29)** | `ui/SCOPE_UI.md` — nav **Insights**; board **Insights \| Frictions**; route stays `/app/artifacts` |
| **Interaction polish** | **This file** (`scope/UI_INTERACTION_CONTRACT.md`) |
| **Screen inventory** | `epics/UI_SCREEN_SPECS.md` (layout + loaders; empty/error rows point here) |
| **AI / LLM** | `scope/AI_CALL_CONTRACT.md` — templates default; do not contradict |

**Rule:** Epics **08** and **09** must implement **every row** in this contract (state matrix, toasts, banners, per-route empty/loading/error, modals, a11y, reduced-motion). Agents must **not invent** hover/toast/banner copy — use exact en-GB strings below. Weekend QA: `epics/UI_POLISH_CHECKLIST.md`.

---

## B. Design tokens refresh

**`ui/styles.css` `:root` wins** over older cream tokens in `UI_SCREEN_SPECS.md` / `epics/README.md`. Port these into `app/styles/syndicate.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-canvas` | `#f3f0eb` | Page background (warm grey — not older `#f2ebe3`) |
| `--bg-canvas-deep` | `#ebe8e2` | Sidenav wash |
| `--bg-surface` | `#ffffff` | Cards (not older `#fffcf7`) |
| `--bg-subdued` | `#f5f2ed` | Nested / muted fills |
| `--bg-hover` | `#faf8f5` | Hover washes |
| `--border` | `#e6e0d6` | Default borders |
| `--border-strong` | `#c9c0b4` | Hover / emphasis borders |
| `--text` | `#1c1917` | Body |
| `--text-subdued` | `#6f6860` | Secondary |
| `--text-disabled` | `#9a9288` | Disabled labels |
| `--charcoal` | `#292524` | Top bar |
| `--navy` | `#1a2744` | Structure / info / focus ring option |
| `--kit-red` | `#a11d2a` | Kit stripe · Frictions left border · critical accents **only** |
| `--primary` | `#008060` | **Primary CTAs only** |
| `--primary-hover` | `#006e52` | Primary hover |
| `--primary-pressed` | `#005e46` | Primary active |
| `--primary-subdued` | `#e8f3ee` | Success badge wash |
| `--critical` | `#c2410c` | Critical banner / destructive tone |
| `--critical-subdued` | `#fef2ee` | Critical wash |
| `--warning` | `#a16207` | Warning banner |
| `--warning-subdued` | `#fef8eb` | Warning wash |
| `--info` | `#1a2744` | Info banner (navy) |
| `--info-subdued` | `#eef1f6` | Info wash |
| `--success` | `#008060` | Success badge tone (not decoration spam) |
| `--shadow-card` | `0 1px 2px rgba(28,25,23,0.04), 0 0 0 1px rgba(28,25,23,0.02)` | Resting cards |
| `--shadow-raised` | `0 2px 8px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.03)` | Hover lift |
| `--shadow-modal` | `0 0 0 1px rgba(28,25,23,0.05), 0 12px 32px rgba(28,25,23,0.12)` | Modal |
| `--radius-sm` | `8px` | Buttons, pills, inputs |
| `--radius` | `12px` | Cards |
| `--radius-lg` | `16px` | Large panels |
| `--radius-pill` | `999px` | Connected / status pills |
| `--font` | system-ui stack | Body 13.5px |
| `--font-display` | ui-serif / Georgia | H1 + hero titles only |
| `--mono` | ui-monospace stack | Shop domain, provenance shorts |

**Colour discipline:** Green = primary CTAs only. Kit-red = Frictions accents / critical / kit stripe — never decorative spam.

---

## C. Component state matrix

Every interactive component: **default | hover | focus-visible | active/pressed | disabled | loading | error** (where applicable).  
Transitions: **120–160ms ease** unless noted. Polaris mapping is the Remix target; CSS intent is the visual contract.

### Shared focus-visible recipe
`outline: 2px solid var(--navy)` (or `--primary` on green CTAs); `outline-offset: 2px`. Never `outline: none` without this replacement. Also apply to mouse users who tabbed — use `:focus-visible` only.

---

### 1. Primary Button (green)

| State | CSS intent | Polaris | Motion / copy |
|-------|------------|---------|---------------|
| default | bg `--primary`, text `#fff`, border `--primary`, cursor pointer | `Button variant="primary"` | — |
| hover | bg/border `--primary-hover` | Polaris hover | 120ms |
| focus-visible | 2px primary ring, offset 2px | Polaris focus | — |
| active/pressed | bg `--primary-pressed`, slight scale none | pressed | 80ms |
| disabled | opacity 0.5, cursor not-allowed | `disabled` | — |
| loading | spinner left of label; keep width; `aria-busy` | `loading` | label e.g. “Queuing…” |
| error | N/A on button — surface Banner/Toast | — | — |

en-GB labels: **Run agents**, **Retry**, **Resume pipeline**, **Confirm**.

### 2. Secondary Button

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | bg surface, border `--border`, text `--text` | `Button` |
| hover | bg `--bg-hover`, border `--border-strong` | |
| focus-visible | 2px navy ring | |
| active | bg `--bg-subdued` | |
| disabled | opacity 0.5, not-allowed | |
| loading | spinner + “Syncing…” / “Refreshing…” | |

### 3. Tertiary / plain text / link-button

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | transparent bg, text `--text` or navy for links | `Button variant="plain"` / `Link` |
| hover | bg `--bg-subdued`; links underline + primary colour | |
| focus-visible | 2px navy ring | |
| active | bg `--bg-canvas-deep` | |
| disabled | `--text-disabled`, not-allowed | |

### 4. Icon button (Labels, dismiss, close)

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | 32×32 hit target min; transparent; icon opacity 0.7 | `Button icon` / plain |
| hover | bg `--bg-subdued`; icon opacity 1 | |
| focus-visible | 2px navy ring; **must** have `aria-label` | |
| active | bg `--border` wash | |
| disabled | opacity 0.4 | |
| loading | spinner replaces icon | |

**Required aria:** Labels → `aria-label="Enrichment labels"`; dismiss → `aria-label="Dismiss"`; modal close → `aria-label="Close"`.

### 5. Nav item (sidenav)

| State | CSS intent | Polaris / App Bridge |
|-------|------------|----------------------|
| default | padding 9×12, radius 8, text `--text`, weight 500 | `ui-nav-menu` / custom |
| hover | bg `rgba(28,25,23,0.05)` | |
| focus-visible | 2px navy ring inset-safe | |
| active (route) | bg surface, shadow-card, weight 600 | `active` |
| disabled | N/A — hide items instead | |
| loading | N/A | |

Nav labels (D29): Overview · Events · Personas · **Insights** · Agent runs · Settings. Never “Artifacts” in UI chrome.

### 6. Filter pill

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | surface + border + shadow-card | `Button` / custom Tag |
| hover | `--bg-hover`, `--border-strong` | |
| focus-visible | 2px navy ring | |
| active (selected) | `--info-subdued`, border `#c5cedc`, navy text, weight 600 | pressed |
| disabled | opacity 0.5 | |
| loading | N/A — disable row while loader | |

### 7. Provenance chip (Obs / Agg / Hyp / Mock)

| State | CSS intent | Notes |
|-------|------------|-------|
| default | quiet mono chip; short label | Full words in tooltip / modal |
| hover | tooltip: Observed / Aggregate proxy / Model hypothesis / Mock | 0 delay ≤200ms |
| focus-visible | ring + tooltip | keyboard parity |
| active | same as default (not toggle) | |
| disabled | N/A | |
| loading | skeleton 40×16 chip | |

`aria-label` = full word (`"Observed"`, etc.). Sports examples live in EnrichmentLegendModal.

### 8. Mode chip (Physical / Virtual / Hybrid)

| State | CSS intent |
|-------|------------|
| default | quiet Badge/Tag; Virtual slightly emphasised (info wash) |
| hover | no action — tooltip optional “Event mode” |
| focus-visible | ring if filterable |
| active | when used as filter = filter-pill.active |
| disabled | N/A |

### 9. Priority badge P0 / P1 / P2

| State | CSS intent |
|-------|------------|
| default | P0 critical-subdued + critical text; P1 warning; P2 subdued |
| hover/focus | no interaction unless card wraps it |
| disabled/loading | inherit parent |

Text always present — colour not sole signal.

### 10. Status badge (Ready / Draft / Stub / Connected / Demo / Live)

| State | CSS intent |
|-------|------------|
| Ready / Connected | success wash + success text |
| Draft | attention / warning wash |
| Stub | subdued grey |
| Demo | info wash |
| Live | primary-subdued or success |
| hover | none (informational) |

### 11. Card (static + clickable entity card)

| State | CSS intent | Polaris |
|-------|------------|---------|
| default (static) | surface, radius 12, shadow-card | `Card` |
| default (clickable) | same + cursor pointer; wrap in link/`ResourceItem` | |
| hover (clickable) | shadow-raised; border `--border-strong`; **no** green flash | 140ms |
| focus-visible | 2px navy ring on card | |
| active/pressed | shadow-card again | |
| disabled / stub | opacity 0.55; no hover lift; `pointer-events: none`; cursor default | |
| loading | skeleton card block | |
| error | N/A — page Banner | |

### 12. Table row (IndexTable)

| State | CSS intent |
|-------|------------|
| default | surface row |
| hover | `--bg-hover` if navigable |
| focus-visible | ring on row link / cell control |
| active | selected row navy wash subtle |
| disabled | muted text |
| loading | SkeletonTable / 5 shimmer rows |

### 13. Tabs

| State | CSS intent |
|-------|------------|
| default | subdued text |
| hover | text `--text` |
| focus-visible | ring on tab control |
| active | underline **kit-red** (per prototype); weight 600 |
| disabled | `--text-disabled` |
| loading | keep tabs; panel skeleton |

### 14. Toggle / Switch (Pause auto agents)

| State | CSS intent | Behaviour |
|-------|------------|-----------|
| default OFF (auto ON) | Polaris switch unchecked = agents auto-run ON | Instant save — **no confirm modal** |
| default ON (paused) | checked = paused | |
| hover | thumb affordance | |
| focus-visible | ring | |
| active | press on track | |
| disabled | while POST in flight | |
| loading | switch `aria-busy` until toast | |
| error | revert + critical toast “Action failed…” | |

Toast: see catalogue §E.

### 15. Modal (overlay, close, focus trap)

| State | CSS intent |
|-------|------------|
| default open | backdrop rgba(28,25,23,0.45); panel shadow-modal; radius 16 |
| hover close | icon btn hover |
| focus-visible | trap inside; first focusable on open |
| Esc / dismiss | closes; restore focus to trigger |
| loading | body skeletons allowed |
| error | Banner inside modal OK |

### 16. Banner (info / warning / critical / success)

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | tone wash + left border tone colour | `Banner tone=` |
| hover | action links underline | |
| focus-visible | ring on actions | |
| dismissible | optional X; not all banners | |
| loading | N/A | |

Exact copy: §F.

### 17. Toast (App Bridge)

| State | Behaviour |
|-------|-----------|
| default | App Bridge toast; ~3–5s; slide per App Bridge |
| success | tone success when affirming save |
| critical | tone critical for failures |
| action link | optional (`View run →`) |
| reduced-motion | instant appear/disappear if App Bridge allows |

Exact strings: §E. Do not invent.

### 18. EmptyState

| State | CSS intent |
|-------|------------|
| default | icon + heading + body + primary/secondary CTA | Polaris `EmptyState` |
| hover | CTA button states |
| focus-visible | on CTAs |
| loading | never show Empty while loading — skeleton first |

Per-route copy: §G.

### 19. Skeleton blocks

| State | CSS intent |
|-------|------------|
| default | `--bg-subdued` / `#e8e2d8` bars, radius 8 |
| shimmer | 1.2s loop linear gradient |
| reduced-motion | **static** grey — no shimmer |
| error | replace with Banner | |

Recipes per route: §G.

### 20. Confidence bar

| State | CSS intent |
|-------|------------|
| default | track `#e6e0d6`; fill by band: ≥0.75 navy/primary; 0.5–0.74 warning; <0.5 kit-red |
| hover | tooltip “Confidence 0.82” (also `aria-valuetext`) |
| focus-visible | if interactive filter — else decorative with aria |
| loading | indeterminate thin bar |
| motion | optional width animate once on mount 400ms ease; **off** if reduced-motion |

### 21. Pipeline stage chip

| State | CSS intent |
|-------|------------|
| pending | subdued chip |
| running | info wash + subtle pulse opacity (disabled if reduced-motion) |
| complete | success checkmark · brief 200ms |
| failed | critical wash |
| hover | tooltip stage detail |

No confetti.

### 22. Timeline step (agent run)

| State | CSS intent |
|-------|------------|
| pending | hollow circle, subdued |
| running | filled navy / primary pulse |
| done | checkmark |
| failed | kit-red X |
| hover | detail text emphasised |
| live region | polite updates on step change |

### 23. Progress bar / %

| State | CSS intent |
|-------|------------|
| default | Polaris `ProgressBar` or custom |
| running | determinate % from loader |
| indeterminate | while queued |
| complete | 100% then outcome badge |
| reduced-motion | no indeterminate shimmer |

### 24. Input / select (Settings)

| State | CSS intent | Polaris |
|-------|------------|---------|
| default | surface, border, radius 8 | `TextField` / `Select` |
| hover | border-strong | |
| focus-visible | 2px primary/navy ring | |
| disabled | subdued bg | |
| error | critical border + inline error text | `error` |
| loading | readOnly + spinner adjunct | |

### 25. Checkbox (dismiss recommendation — optional MVP)

| State | CSS intent |
|-------|------------|
| default | Polaris Checkbox |
| hover | — |
| focus-visible | ring |
| checked | toast “Recommendation dismissed” if MVP ships dismiss |
| disabled | while saving |
| **If out of MVP:** omit control; do not stub a broken checkbox |

---

## D. Global interaction rules

1. **Cursor:** `pointer` on clickable; `not-allowed` on disabled; `default` elsewhere.  
2. **Focus-visible:** 2px navy or primary ring, offset 2px; never remove outline without replacement.  
3. **Hover transitions:** 120–160ms ease; no bounce/spring.  
4. **No hover-only information** — tooltips must also work for keyboard focus and have accessible names on touch (long-press optional; prefer always-visible short labels).  
5. **Green ONLY** primary CTAs.  
6. **Kit-red ONLY** Frictions accents / critical / kit stripe.  
7. **`prefers-reduced-motion: reduce`:** disable shimmer, translate, pulse; opacity fades ≤150ms or instant; confidence bar no width animation; pipeline no pulse.  
8. **British English** in all strings (organise, labelled, behaviour, cancelled).  
9. **Idempotent actions:** re-clicking Run agents while at cap → toast “Agents already running…”, no duplicate queue.  
10. **Polling:** Agent run detail poll every **2s** while `status==="running"`; stop on completed/failed; show last-updated quietly.

---

## E. Toast catalogue

App Bridge `shopify.toast.show(message, { isError?, duration? })`. Duration **4s** default (range 3–5s). British English — **do not invent**.

| ID | When | Tone | Message (en-GB) | Optional action |
|----|------|------|-----------------|-----------------|
| T01 | Run agents enqueued | default | Agents queued — watching your storefront as {personaName}. | View run → `/app/runs/:id` |
| T02 | Run agents while already at cap / in-flight | default | Agents already running — open Agent runs to watch progress. | View runs → `/app/runs` |
| T03 | Pause auto agents → ON (paused) | default | Auto agents paused for this shop. | — |
| T04 | Pause auto agents → OFF (resumed) | success | Auto agents resumed (capped queue). | — |
| T05 | Refresh store + re-run confirmed | default | Refresh store queued — pipeline will resume from the last successful stage. | — |
| T06 | Pipeline resume after failure | default | Pipeline resumed from {stageLabel}. | — |
| T07 | Sync / catalogue retry queued | default | Sync retry queued. | — |
| T08 | Generic action failure | critical | Action failed — try again in a moment. | — |
| T09 | Recommendation dismissed (if MVP) | default | Recommendation dismissed. | Undo (optional) |
| T10 | Agent run complete (nice-to-have) | success | Agent run complete. | See Insights / Frictions → `/app/artifacts` |
| T11 | Storefront URL missing blocks run | critical | Add a storefront URL in Settings before running agents. | Settings → |
| T12 | No Ready persona | default | No Ready personas yet — finish scoring or unpause drafts. | Personas → |

**Prototype alignment:** HTML `app.js` used slightly different strings; **this catalogue wins** for Remix. Map prototype “Auto agents paused…” → T03/T04; “Queued Refresh store…” → T05 (after confirm).

---

## F. Banner catalogue (page-level)

| ID | Where | Tone | Copy (en-GB) | Primary | Secondary |
|----|-------|------|--------------|---------|-----------|
| B01 | Overview / Settings / any | critical | Shopify rate-limited this sync (HTTP 429). Wait a moment and retry. | Retry | Dismiss |
| B02 | Overview / Settings | critical | Pipeline failed at **{stageLabel}**. In-flight work stopped; you can resume from the last successful stage. | Resume pipeline | View Settings |
| B03 | Overview | info | No orders in the last 60 days yet. Connect a busier store or load demo fixtures. | Load demo fixtures | Settings |
| B04 | Overview / Agent runs / Settings | info | Auto agents are paused. Manual **Run agents** still works; new auto-queues will not start. | Resume auto agents | Dismiss |
| B05 | Agent runs + Insights | info | Agents stop before payment — checkout may start; no charge is taken. | — | Dismiss (optional) |
| B06 | Overview / Agent runs | warning | Storefront URL missing — agents cannot browse your shop. | Open Settings | — |
| B07 | Settings (LLM card) | *quiet note, not a scary banner* | Recommendation naming uses **templates** by default. Optional OpenAI / Anthropic polish is off unless a key is set — see AI call contract. | — | — |
| B08 | Settings / Overview | warning | Catalogue degraded — football fixtures and/or weather are on last-good or MOCK. Insights may under-count live occasions. | Retry catalogue | Dismiss |
| B09 | Events | warning | Scoring job failed — event list may be stale. | Recompute | Settings |
| B10 | Insights | info | Run agents to generate Insights and Frictions for this shop. | Run agents | Agent runs |

B07 is a **Card footnote / subdued Text**, not `Banner tone=critical`.

---

## G. Empty / loading / error matrix BY ROUTE

Matrix IDs: `R{n}-{L|E|X|P}` = Loading | Empty | eXrror | Partial.

| Route | Loading skeleton recipe | Empty copy + CTA | Error copy + CTA | Partial / degraded |
|-------|-------------------------|------------------|------------------|--------------------|
| `/app` Overview | Metric strip 3 cells + 2 card skeletons (`R1-L`) | “No occasions yet — sync orders or load demo fixtures.” → Settings / Load fixtures (`R1-E`) | Banner B01/B02 if SyncRun/PipelineRun failed (`R1-X`) | B08 catalogue degraded; pipeline strip shows mid-run (`R1-P`) |
| `/app/events` | 3 entity-card skeletons + SkeletonTable 5 rows (`R2-L`) | “No events scored yet.” CTA Recompute / Settings (`R2-E`) | B09 + Retry (`R2-X`) | Hyp-only Unknown Fri still listed; banner optional (`R2-P`) |
| `/app/events/:id` | SkeletonPage header + tab panel body (`R3-L`) | Tab empty: “No catalogue affinity edges yet.” (`R3-E`) | “Event not found.” + Back to Events (`R3-X`) | Missing signal group → “No {signals} yet” inside tab (`R3-P`) |
| `/app/personas` | 3 skeleton cards (`R4-L`) | “No personas derived — score events first.” (`R4-E`) | Banner load failure + Retry (`R4-X`) | Fashion stub always visible once shop exists (`R4-P`) |
| `/app/personas/:id` | SkeletonPage (`R5-L`) | Prior runs: “No agent runs yet — queue one before kick-off.” (`R5-E`) | Not found / stub parked page (`R5-X`) | Draft: Run agents allowed but toast may warn (`R5-P`) |
| `/app/artifacts` **Insights** | Dual column skeletons + 2 rec card skeletons (`R6-L`) | “Run agents to generate Insights & Frictions.” CTA `/app/runs` (`R6-E`) · Export → ExportNotWiredModal | Board load error Banner + Retry (`R6-X`) | One column empty OK; show “None yet” in column (`R6-P`) |
| `/app/runs` | Active card skeleton + table rows (`R7-L`) | “Queue a run to watch a persona shop.” + Run agents (`R7-E`) | Critical Banner + `errorMessage` (`R7-X`) | Idle placeholder timeline until first run (`R7-P`) |
| `/app/runs/:id` | Progress + 5 timeline step skeletons (`R8-L`) | N/A (redirect list if missing) | Failed run Banner + errorMessage (`R8-X`) | Polling: “Updating…" live region polite (`R8-P`) |
| `/app/settings` | Card DL skeletons (`R9-L`) | Sync rules EmptyState: “No custom sync rules yet. Syndicate syncs orders and calendars with sensible defaults.” (`R9-E`) | B01 in Sync card; playground Error429Modal (`R9-X`) | B07 LLM quiet note; B08 degraded sources; Pause banner B04 (`R9-P`) |

---

## H. Modal inventory

| ID | Name | Trigger | Content / behaviour |
|----|------|---------|---------------------|
| M01 | **EnrichmentLegendModal** | Overview Labels · Settings Compliance | Bullets: **Observed** — shop orders / catalogue (e.g. home-kit SKUs sold Sat). **Aggregate proxy** — Open-Meteo city weather, postcode sector geo, hashtag watchlist buzz. **Model hypothesis** — confidence residual / LLM naming polish (Hyp). **Mock** — Hyrox meet, parkrun-shaped, virtual challenge seed. |
| M02 | **ExportNotWiredModal** | Insights → Export brief | Title: “Export not wired”. Body: “PDF / Notion export is not in this build.” Primary: Close. |
| M03 | **LoadingExampleModal** | Settings playground (`DEMO_STATE_PLAYGROUND`) | Title: “Syncing catalogue…”. Skeleton shimmer bars. |
| M04 | **Error429Modal** | Settings playground | Critical Banner B01 + Retry / Dismiss. |
| M05 | **Confirm Pause?** | — | **DOES NOT EXIST.** Pause is instant toggle + toast T03/T04. Documented so agents do not add a confirm. |
| M06 | **ConfirmRefreshStoreModal** | Settings → Refresh store + re-run | Body: “Re-run pipeline from store makeup? In-flight agents finish; new auto-queue respects Pause.” Actions: **Confirm** (primary) / **Cancel** (secondary). On Confirm → T05. |

---

## I. Keyboard & a11y

| Rule | Spec |
|------|------|
| **Tab order** | Prefer **Polaris / App Bridge Admin embed pattern**: App Bridge top chrome (shop context) → page title actions (Labels, Run agents) → main content → left nav last *or* NavMenu as App Bridge provides. **Locked default:** do not fight App Bridge — document focus order in PR if diverging. Within page: primary CTA early. |
| **Esc** | Closes topmost modal; restores focus to opener |
| **Enter / Space** | Activates focused button / pill / switch |
| **Icon-only** | Visible `aria-label` (Labels, Close, Dismiss) |
| **Provenance chips** | `aria-label="Observed"` (etc.) on short Obs/Agg/Hyp/Mock |
| **Live region** | `aria-live="polite"` on agent progress % and timeline step changes |
| **Colour** | Badges always include text (Ready, P0, Physical…) |
| **Focus trap** | Modals via Polaris Modal default |
| **Skip** | Optional skip-to-content link if shell is custom — nice-to-have |

---

## J. Motion & micro-interactions

| Interaction | Spec | Reduced motion |
|-------------|------|----------------|
| Pipeline stage complete | Brief checkmark · ≤200ms | Instant checkmark, no pulse |
| Confidence bar | Optional width animate once 400ms ease on mount | Final width immediately |
| Toast | App Bridge default slide | Instant if possible |
| Skeleton | Shimmer 1.2s loop | Static grey |
| Entity card hover | Shadow raise 140ms | Opacity/border only, no translate |
| Timeline step advance | Fade 120ms | Instant |
| **Forbidden** | Confetti, bounce, spring, parallax, green success floods | — |

---

## K. Stub / disabled behaviours

| Case | Behaviour |
|------|-----------|
| **Fashion stub persona** | opacity 0.55; no hover lift; no navigation; tooltip / title “Parked for this weekend”; `aria-disabled="true"` |
| **Run agents disabled** when | (a) no Ready persona → show B06-style reason or T12; (b) no `storefrontUrl` → B06; (c) agents already at cap → button disabled + T02 on click attempt |
| **Re-scan / Refresh** while SyncRun or PipelineRun running | Button label **“Syncing…”** / **“Refreshing…”**; disabled; spinner |
| **Draft persona** | Navigable; Run agents OK; badge Draft |
| **Export brief** | Always opens M02 — never silent fail |

---

## L. Polish acceptance checklist (≥25)

See also printable `epics/UI_POLISH_CHECKLIST.md`.

- [ ] L01 Primary CTA uses `#008060` only on primary buttons  
- [ ] L02 Kit-red not used as decorative fill on Insights (positive) cards  
- [ ] L03 Every button has hover + focus-visible + disabled styles  
- [ ] L04 Nav label **Insights** (never Artifacts) on all pages  
- [ ] L05 Insights board columns **Insights \| Frictions**  
- [ ] L06 Overview KPIs show Events · Insights · Frictions separately  
- [ ] L07 Entity cards raise shadow on hover; stubs do not  
- [ ] L08 Filter pills show active navy wash  
- [ ] L09 Provenance chips expose full `aria-label` + tooltip  
- [ ] L10 Mode chips Physical / Virtual / Hybrid visible on Events  
- [ ] L11 Toast T01 fires on Run agents  
- [ ] L12 Toast T02 when agents already running (idempotent)  
- [ ] L13 Pause toggle instant — no confirm modal; T03/T04  
- [ ] L14 Refresh store opens M06 then T05  
- [ ] L15 Banner B01 pattern for 429 with Retry  
- [ ] L16 Banner B05 stop-before-pay on Agent runs + Insights  
- [ ] L17 Banner B06 when storefront URL missing  
- [ ] L18 Empty states match §G copy (spot-check Overview + Insights + Runs)  
- [ ] L19 Loading skeletons appear before empty (no empty flash)  
- [ ] L20 Error 404 event shows back CTA  
- [ ] L21 Esc closes EnrichmentLegendModal; focus returns  
- [ ] L22 Icon Labels has aria-label  
- [ ] L23 Agent progress updates polite live region  
- [ ] L24 `prefers-reduced-motion` kills skeleton shimmer  
- [ ] L25 Fashion stub opacity ~0.55, not clickable  
- [ ] L26 Run agents disabled reasons surfaced (banner or toast)  
- [ ] L27 Re-scan shows “Syncing…” while running  
- [ ] L28 Confidence bar bands colour + numeric text/tooltip  
- [ ] L29 LLM Settings shows quiet templates note (B07), not critical Banner  
- [ ] L30 British English QA — no analyze/favor/canceled in UI strings  

---

## M. Builder implementation order

1. **Port CSS variables** from `ui/styles.css` → `app/styles/syndicate.css`; add state utility classes (`.is-loading`, `.is-disabled`, focus-visible).  
2. **Shared primitives** — Button wrappers, Badge (provenance/mode/priority/status), Banner, Toast helpers (catalogue IDs), EmptyState, Skeleton, Modal (M01–M04, M06).  
3. **Wire screens** — Overview → Events → Personas → Insights → Runs → Settings; attach §G matrix IDs in route comments.  
4. **State matrix QA** — walk §L / `UI_POLISH_CHECKLIST.md` against this contract; fix gaps before demo dry-run.

---

## Cross-links

- `epics/UI_POLISH_CHECKLIST.md` — printable weekend QA  
- `epics/08-admin-ui.md` · `epics/09-settings-empty-states.md` — DoD includes this contract  
- `epics/UI_SCREEN_SPECS.md` — layout SoT; points here for polish  
- `ui/SCOPE_UI.md` §4 — summary table; this file authoritative for interaction  
- `scope/WEEKEND_BUILD_SPEC.md` · `scope/AGENT_KICKOFF.md` — weekend entry  

**Explicit hold:** Specs only until Austin says **build**.
