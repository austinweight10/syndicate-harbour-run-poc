# PATH_DAWN_HARBOUR — Playwright contract (Harbour Run)

**Theme:** Dawn (published)  
**Locale:** English (UK) · GBP  
**Store:** Harbour Run  
**Stop policy:** checkout **start** only — never payment  
**Machine path JSON:** `fixtures/agents/path-harbour-run-dawn.json` (pack copy + repo fixtures copy)

> Deprecated: `path-harbour-athletic-dawn.json` / `path-football-merch.json` (football kit era). Use **harbour-run** for the weekend demo.

---

## Happy path (Race-day taper)

| # | Step | Action | Target / selector strategy |
|---|------|--------|----------------------------|
| 1 | home | `goto` | `{SHOP_STOREFRONT_URL}/` |
| 2 | nav | click | Role/link **Race Kits** (nav) — fallback `a[href*="/collections/race-kits"]` |
| 3 | collection | expect | URL contains `/collections/race-kits`; product card **Race Tee** |
| 4 | open PDP | click | Text **Race Tee — Unisex** |
| 5 | size L | click | Role/radio or button/option **L** — Dawn fieldset legend Size |
| 6 | ATC | click | Button **Add to cart** (`data-syndicate="atc"` if hooks installed) |
| 7 | continue | click / dismiss | Dawn cart drawer **Continue shopping** if present; else proceed |
| 8 | shorts (optional) | click / goto | **Running Shorts** in Race Kits or `/products/running-shorts` → size L → ATC |
| 9 | kids | `goto` or nav | `/collections/kids-youth` or nav **Kids & Youth** |
| 10 | youth tee PDP | click | Text **Kids / Youth Run Tee** |
| 11 | observe | assert miss | **No** visible “Size guide” heading/section (P0 Insight evidence) |
| 12 | ATC optional | click | **Add to cart** (optional) |
| 13 | cart | `goto` | `/cart` |
| 14 | checkout | click | **Check out** / **Checkout** |
| 15 | stop | stop | URL matches checkout; **do not** fill card / Shop Pay submit |

Outcome: `checkout_started`.

---

## Selector strategy (priority)

1. **Role + accessible name** (`getByRole('link', { name: 'Race Kits' })`).  
2. **Visible text** (`getByText('Race Tee', { exact: false })`).  
3. **Href contains** collection/product handle.  
4. **Optional** `data-syndicate-*` from `theme-snippets/syndicate-demo-hooks.liquid`.  
5. Last resort: Dawn classes — brittle; avoid locking DoD on them.

---

## Password gate (if enabled)

Before step 1:

1. If URL/title indicates password page → fill `input[type=password]` / `name=password` with `SHOP_STOREFRONT_PASSWORD`.  
2. Submit.  
3. Continue path.

Prefer disabling password (SETUP_RUNBOOK §4).

---

## Deny-list (hard stop)

Never click / submit:

- Pay now / Complete order / Buy it now (payment) / Shop Pay wallet submit  
- URLs matching `/checkouts/*/payment` form submit  
- Enter credit card fields

---

## Viewport

Race-day taper: **390×844** (mobile-first).  
Wet-weather trainer (optional second path): same — not required for gate.

---

## Headed green (LIVE_DEMO_GATE)

```bash
# Example — wire to epic 06 runner when built
SHOP_STOREFRONT_URL=https://harbour-run-demo.myshopify.com \
AGENTS_HEADED=1 \
npm run agents:run -- --persona pers_race_day_taper --path path-harbour-run-dawn
```

Pass criteria: timeline ≥5 steps; outcome `checkout_started`; ≥1 InsightScore `sizing` on youth tee; no payment URL.
