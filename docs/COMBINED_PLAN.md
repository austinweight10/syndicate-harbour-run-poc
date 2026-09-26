# Syndicate — Cursor Commerce Hackathon combined plan
22 Sep 2026 · Competitive research + MVP architecture

## Positioning
**Occasion commerce intelligence for Shopify** — discover the events that drive buy intent, then pressure-test the storefront with digital twin shoppers.

**One-liner:** Enrichment apps tell you *who*; personalization engines change *what they see*; we show *why they buy this weekend* and *whether your site is ready for that shopper*.

**Pitch line:** Stop guessing race-weekend merch. Watch your store shop itself as the people who actually buy.

## Competitive honesty
| Cousin | Owns | Missing vs Syndicate |
|--------|------|----------------------|
| Opensend / Decile / 2Segment | Enrichment + personas | No synthetic shoppers / event discovery |
| UserApproved AI (~4/5 closest) | AI shoppers + friction | No first-class event/occasion layer |
| PAARS / SimGym (research) | Personas → agents | Not a Shopify product |
| Schedulers / outfit builders | Merchant-defined events | Don't *discover* events from orders |

**White space:** Event/occasion discovery from Shopify data → event-linked personas → agents shop live store → resonate / don't artifacts. No sourced product markets that full loop.

## MVP (1 day) — see MVP_ARCHITECTURE.md
Must: OAuth + ingest · 2–3 Events · 2–3 Personas · 2–3 Playwright runs · **Admin UI reading Prisma/SQLite** (not mockup-only / not route-imported JSON) — [`scope/LIVE_DATA_WIRE.md`](./scope/LIVE_DATA_WIRE.md)
Primary vertical: **Harbour Run / running**
Cut: wealth APIs · pixels · real checkout · App Store polish
Ethics: behavioural + location + taxonomy; mock enrichment labelled; stop before payment

## Demo narrative (5–7 min)
1. Connect Shopify (or `db:seed` + `pipeline:demo` fixture shop)
2. Surface Events + Personas **from SQLite**
3. Run agents → Insights | Frictions **from DB**
4. Optional one merchandising tweak

## Risks (pitch carefully)
GDPR profiling if wealth/demo inferred · Shopify rate limits · ToS if agents complete checkout on prod
