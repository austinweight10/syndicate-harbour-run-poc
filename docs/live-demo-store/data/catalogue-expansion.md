# Catalogue expansion — Harbour Run demo store

| Field | Value |
|-------|-------|
| Source | Soar Running (soarrunning.com) public storefront — product range, types, sizes, colours, GBP prices and collection structure (facts only) |
| Retrieved | 2026-09-26 |
| Rebrand | Vendor `Harbour Run`; Soar trademarks / sub-brand names dropped from titles; descriptions are original; CSV images are placehold.co, replaced by the rendered `images/` set via the seeder's `images` stage |
| Products added | 47 |
| Variants added | 409 |
| Collections added | 18 (existing 4 unchanged; main menu unchanged) |
| Catalogue totals | 56 products · 435 variants · 22 collections |
| Price currency | GBP (Soar full prices; where Soar showed two prices the full one was used) |
| Inventory | 50 per variant, policy deny |

Seed files: `products.csv` (rows appended after the original 9 products), `COLLECTIONS` in
`scripts/seed_store.py`, human-readable collection spec in `collections.md` §5–22.

SKU pattern: `HR-<PRODUCT>-<COLOUR>-<SIZE>`. Options: Option1 `Size`, Option2 `Colour`.

Demo contracts preserved: Race Kits (`race-kits`) membership unchanged and shell-free;
Kids / Youth Run Tee untouched (still no size guide); main menu stays Home + the four
original collections; every SKU in `orders-seed.json` still exists.

Skipped Soar categories: bundles / race systems / gift edits / gift vouchers, sale and
archive, brand collaborations and custom club vests, eyewear (collab only), bags,
spares & care (third-party wash products), ProtoLab and other sub-brand edits,
lifestyle items (denim, bomber), speedsuits, underwear and calf guards (kept the range
under 50 products). Soar has no kids range, so no kids products were added.

## Products

| Handle | Title | Type | Price (GBP) | Variants | Sizes | Colours | Tags |
|--------|-------|------|-------------|----------|-------|---------|------|
| `mens-race-tee` | Men's Race Tee | Apparel | 90.00 | 12 | XS / S / M / L / XL / XXL | Black / Silver | `race_day,race_kit,running,adult_size` |
| `womens-race-tee` | Women's Race Tee | Apparel | 90.00 | 10 | XS / S / M / L / XL | Black / Silver | `race_day,race_kit,running,adult_size` |
| `mens-eco-tech-tee` | Men's Eco Tech Tee | Apparel | 85.00 | 12 | XS / S / M / L / XL / XXL | Grey / Yellow | `running,club_social,adult_size` |
| `womens-eco-tech-tee` | Women's Eco Tech Tee | Apparel | 85.00 | 10 | XS / S / M / L / XL | Grey / Cream | `running,club_social,adult_size` |
| `mens-hot-weather-tee` | Men's Hot Weather Tee | Apparel | 105.00 | 12 | XS / S / M / L / XL / XXL | White/Blue Stripe / Grey/Navy Stripe | `running,race_day,adult_size` |
| `womens-hot-weather-tee` | Women's Hot Weather Tee | Apparel | 105.00 | 10 | XS / S / M / L / XL | White/Blue Stripe / Warm Grey/Yellow | `running,race_day,adult_size` |
| `mens-race-vest-2` | Men's Race Vest 2.0 | Vests | 95.00 | 18 | XS / S / M / L / XL / XXL | White / Black / Bright Green | `race_day,race_kit,running,adult_size` |
| `womens-race-vest` | Women's Race Vest | Vests | 95.00 | 10 | XS / S / M / L / XL | Black / White | `race_day,race_kit,running,adult_size` |
| `womens-crop-race-vest` | Women's Crop Race Vest | Vests | 80.00 | 4 | XS / S / M / L | Black | `race_day,race_kit,adult_size` |
| `mens-training-singlet` | Men's Training Singlet | Vests | 95.00 | 12 | XS / S / M / L / XL / XXL | White/Blue Stripe / Grey/Navy Stripe | `running,race_day,adult_size` |
| `mens-elite-race-vest` | Men's Elite Race Vest | Vests | 190.00 | 6 | XS / S / M / L / XL / XXL | Fluro/Light Blue | `race_day,race_kit,adult_size` |
| `mens-long-sleeve-tech-tee` | Men's Long Sleeve Tech Tee | Apparel | 100.00 | 12 | XS / S / M / L / XL / XXL | Grey / Dark Brown | `running,layers,adult_size` |
| `womens-long-sleeve-tech-tee` | Women's Long Sleeve Tech Tee | Apparel | 100.00 | 10 | XS / S / M / L / XL | Grey / Cream | `running,layers,adult_size` |
| `mens-tempo-top` | Men's Tempo Top | Apparel | 210.00 | 12 | XS / S / M / L / XL / XXL | Black / Dark Brown | `layers,running,wx_aware,adult_size` |
| `mens-merino-silk-base-layer-ls` | Men's L/S Merino & Silk Base Layer | Base Layers | 95.00 | 12 | XS / S / M / L / XL / XXL | Grey / Forest Night | `layers,wx_aware,running,adult_size` |
| `womens-merino-silk-base-layer-ls` | Women's L/S Merino & Silk Base Layer | Base Layers | 95.00 | 10 | XS / S / M / L / XL | Grey / Blue Iris | `layers,wx_aware,running,adult_size` |
| `mens-thermal-top` | Men's Thermal Top | Base Layers | 140.00 | 6 | XS / S / M / L / XL / XXL | Blue Grey | `layers,wx_aware,adult_size` |
| `mens-all-weather-jacket` | Men's All Weather Jacket | Outerwear | 370.00 | 6 | XS / S / M / L / XL / XXL | Black | `waterproof,shell,wx_aware,wet_weather,outerwear,adult_size` |
| `mens-packable-rain-shell` | Men's Packable Rain Shell | Outerwear | 220.00 | 12 | XS / S / M / L / XL / XXL | Orange / Black | `waterproof,shell,wx_aware,wet_weather,outerwear,adult_size` |
| `womens-packable-rain-shell` | Women's Packable Rain Shell | Outerwear | 220.00 | 10 | XS / S / M / L / XL | Orange / Black | `waterproof,shell,wx_aware,wet_weather,outerwear,adult_size` |
| `mens-windbreaker` | Men's Windbreaker | Jackets | 245.00 | 12 | XS / S / M / L / XL / XXL | Navy / Black | `windproof,layers,wx_aware,adult_size` |
| `womens-windbreaker` | Women's Windbreaker | Jackets | 245.00 | 10 | XS / S / M / L / XL | Opal Grey / Black | `windproof,layers,wx_aware,adult_size` |
| `mens-showerproof-gilet` | Men's Showerproof Gilet | Jackets | 190.00 | 12 | XS / S / M / L / XL / XXL | Black / Ecru | `wet_weather,windproof,layers,wx_aware,adult_size` |
| `mens-insulated-run-jacket` | Men's Insulated Run Jacket | Jackets | 375.00 | 6 | XS / S / M / L / XL / XXL | Black | `layers,windproof,wx_aware,adult_size` |
| `mens-marathon-shorts` | Men's Marathon Shorts | Shorts | 180.00 | 12 | XS / S / M / L / XL / XXL | Black / Silver | `race_day,race_kit,shorts,adult_size` |
| `womens-marathon-shorts` | Women's Marathon Shorts | Shorts | 180.00 | 10 | XS / S / M / L / XL | Black / Silver | `race_day,race_kit,shorts,adult_size` |
| `mens-run-shorts` | Men's Run Shorts | Shorts | 100.00 | 12 | XS / S / M / L / XL / XXL | Black / Burgundy | `running,shorts,adult_size` |
| `mens-split-shorts` | Men's Split Shorts | Shorts | 100.00 | 12 | XS / S / M / L / XL / XXL | Black / Tan | `race_day,running,shorts,adult_size` |
| `womens-split-shorts` | Women's Split Shorts | Shorts | 100.00 | 10 | XS / S / M / L / XL | Black / Burgundy | `race_day,running,shorts,adult_size` |
| `womens-speed-shorts` | Women's Speed Shorts | Shorts | 110.00 | 10 | XS / S / M / L / XL | Black / Navy | `race_day,race_kit,shorts,adult_size` |
| `mens-trail-shorts` | Men's Trail Shorts | Shorts | 170.00 | 12 | XS / S / M / L / XL / XXL | Black / Grey/Dark Grey | `running,shorts,adult_size` |
| `womens-trail-shorts` | Women's Trail Shorts | Shorts | 170.00 | 10 | XS / S / M / L / XL | Black / Grey/Dark Grey | `running,shorts,adult_size` |
| `mens-half-tights` | Men's Half Tights | Tights | 115.00 | 12 | XS / S / M / L / XL / XXL | Black / Navy | `running,race_day,adult_size` |
| `womens-merino-half-tights` | Women's Merino Half Tights | Tights | 150.00 | 5 | XS / S / M / L / XL | Black | `running,layers,wx_aware,adult_size` |
| `mens-session-tights` | Men's Session Tights | Tights | 160.00 | 6 | XS / S / M / L / XL / XXL | Black | `running,layers,wx_aware,adult_size` |
| `womens-run-tights` | Women's Run Tights | Tights | 175.00 | 10 | XS / S / M / L / XL | Black / Dark Grey | `running,layers,wx_aware,adult_size` |
| `mens-run-trousers` | Men's Run Trousers | Apparel | 180.00 | 6 | XS / S / M / L / XL / XXL | Black | `running,recovery,athleisure,club_social,adult_size` |
| `race-socks` | Race Socks | Accessories | 24.00 | 6 | S / M / L | White/Fluro Yellow / Navy/Red | `race_day,race_kit,socks,adult_size` |
| `merino-crew-socks` | Merino Crew Socks | Accessories | 26.00 | 6 | S / M / L | Charcoal / Cream/Grey | `socks,wx_aware,running,adult_size` |
| `ankle-socks` | Ankle Socks | Accessories | 20.00 | 6 | S / M / L | Black / White | `socks,running,adult_size` |
| `run-cap` | Run Cap | Accessories | 55.00 | 2 | One size | Black/White / Slate | `cap,race_day,club_social,adult_size` |
| `merino-silk-beanie` | Merino Silk Beanie | Accessories | 45.00 | 2 | One size | Grey / Forest Night | `layers,wx_aware,adult_size` |
| `merino-silk-neck-warmer` | Merino Silk Neck Warmer | Accessories | 45.00 | 1 | One size | Grey | `layers,wx_aware,adult_size` |
| `arm-sleeves` | Arm Sleeves | Accessories | 65.00 | 3 | S / M / L | Black | `layers,race_day,wx_aware,adult_size` |
| `winter-gloves` | Winter Running Gloves | Accessories | 50.00 | 3 | S / M / L | Black | `layers,wx_aware,adult_size` |
| `headband` | Running Headband | Accessories | 25.00 | 1 | One size | Black | `running,wx_aware,adult_size` |
| `trail-race-pack` | Trail Race Pack | Hydration | 260.00 | 6 | XS/S / M/L / XL/XXL | Black / White | `hydration,race_day,running,adult_size` |

## Collections

| Handle | Title | Products | In main menu |
|--------|-------|----------|--------------|
| `mens` | Men's | 22 | no |
| `womens` | Women's | 15 | no |
| `t-shirts` | T-Shirts | 7 | no |
| `singlets-vests` | Singlets & Vests | 5 | no |
| `long-sleeve-tops` | Long Sleeve Tops | 4 | no |
| `baselayers` | Baselayers | 3 | no |
| `jackets-gilets` | Jackets & Gilets | 8 | no |
| `shorts` | Shorts | 9 | no |
| `half-tights` | Half Tights | 2 | no |
| `tights-trousers` | Tights & Trousers | 4 | no |
| `socks` | Socks | 4 | no |
| `caps-beanies` | Caps & Beanies | 5 | no |
| `sleeves-gloves` | Sleeves & Gloves | 2 | no |
| `accessories` | Accessories | 13 | no |
| `race` | Race | 13 | no |
| `trail` | Trail | 9 | no |
| `hot-weather` | Hot Weather | 6 | no |
| `cold-weather` | Cold Weather | 17 | no |

## Product → collections

New products, then existing products that joined new collections. Existing-collection
memberships (race-kits, wet-weather-training, race-day-essentials, kids-youth) are unchanged
and not repeated here.

| Handle | New? | Collections |
|--------|------|-------------|
| `mens-race-tee` | yes | `mens`, `t-shirts`, `race` |
| `womens-race-tee` | yes | `womens`, `t-shirts`, `race` |
| `mens-eco-tech-tee` | yes | `mens`, `t-shirts` |
| `womens-eco-tech-tee` | yes | `womens`, `t-shirts` |
| `mens-hot-weather-tee` | yes | `mens`, `t-shirts`, `hot-weather` |
| `womens-hot-weather-tee` | yes | `womens`, `t-shirts`, `hot-weather` |
| `mens-race-vest-2` | yes | `mens`, `singlets-vests`, `race` |
| `womens-race-vest` | yes | `womens`, `singlets-vests`, `race` |
| `womens-crop-race-vest` | yes | `womens`, `singlets-vests`, `race` |
| `mens-training-singlet` | yes | `mens`, `singlets-vests`, `hot-weather` |
| `mens-elite-race-vest` | yes | `mens`, `singlets-vests`, `race` |
| `mens-long-sleeve-tech-tee` | yes | `mens`, `long-sleeve-tops` |
| `womens-long-sleeve-tech-tee` | yes | `womens`, `long-sleeve-tops` |
| `mens-tempo-top` | yes | `mens`, `long-sleeve-tops`, `cold-weather` |
| `mens-merino-silk-base-layer-ls` | yes | `mens`, `baselayers`, `cold-weather` |
| `womens-merino-silk-base-layer-ls` | yes | `womens`, `baselayers`, `cold-weather` |
| `mens-thermal-top` | yes | `mens`, `baselayers`, `cold-weather` |
| `mens-all-weather-jacket` | yes | `mens`, `jackets-gilets`, `cold-weather` |
| `mens-packable-rain-shell` | yes | `mens`, `jackets-gilets` |
| `womens-packable-rain-shell` | yes | `womens`, `jackets-gilets` |
| `mens-windbreaker` | yes | `mens`, `jackets-gilets`, `cold-weather` |
| `womens-windbreaker` | yes | `womens`, `jackets-gilets`, `cold-weather` |
| `mens-showerproof-gilet` | yes | `mens`, `jackets-gilets` |
| `mens-insulated-run-jacket` | yes | `mens`, `jackets-gilets`, `trail`, `cold-weather` |
| `mens-marathon-shorts` | yes | `mens`, `shorts`, `race` |
| `womens-marathon-shorts` | yes | `womens`, `shorts`, `race` |
| `mens-run-shorts` | yes | `mens`, `shorts` |
| `mens-split-shorts` | yes | `mens`, `shorts`, `hot-weather` |
| `womens-split-shorts` | yes | `womens`, `shorts`, `hot-weather` |
| `womens-speed-shorts` | yes | `womens`, `shorts`, `race` |
| `mens-trail-shorts` | yes | `mens`, `shorts`, `trail` |
| `womens-trail-shorts` | yes | `womens`, `shorts`, `trail` |
| `mens-half-tights` | yes | `mens`, `half-tights`, `race` |
| `womens-merino-half-tights` | yes | `womens`, `half-tights`, `cold-weather` |
| `mens-session-tights` | yes | `mens`, `tights-trousers`, `cold-weather` |
| `womens-run-tights` | yes | `womens`, `tights-trousers`, `cold-weather` |
| `mens-run-trousers` | yes | `mens`, `tights-trousers` |
| `race-socks` | yes | `socks`, `accessories`, `race` |
| `merino-crew-socks` | yes | `socks`, `accessories`, `cold-weather` |
| `ankle-socks` | yes | `socks`, `accessories` |
| `run-cap` | yes | `caps-beanies`, `accessories`, `hot-weather` |
| `merino-silk-beanie` | yes | `caps-beanies`, `accessories`, `trail`, `cold-weather` |
| `merino-silk-neck-warmer` | yes | `caps-beanies`, `accessories`, `trail`, `cold-weather` |
| `arm-sleeves` | yes | `sleeves-gloves`, `accessories`, `race`, `cold-weather` |
| `winter-gloves` | yes | `sleeves-gloves`, `accessories`, `trail`, `cold-weather` |
| `headband` | yes | `caps-beanies`, `accessories`, `trail` |
| `trail-race-pack` | yes | `accessories`, `race`, `trail` |
| `race-tee-unisex` | no | `t-shirts` |
| `half-zip-midlayer` | no | `long-sleeve-tops`, `cold-weather` |
| `waterproof-shell-jacket` | no | `jackets-gilets` |
| `running-shorts` | no | `shorts` |
| `recovery-joggers` | no | `tights-trousers` |
| `performance-socks` | no | `socks`, `accessories` |
| `trail-or-road-cap` | no | `caps-beanies`, `accessories` |
| `soft-flask` | no | `accessories`, `trail` |

## New SKUs

| SKU | Handle | Size | Colour | Price (GBP) |
|-----|--------|------|--------|-------------|
| `HR-MRT-BLK-XS` | `mens-race-tee` | XS | Black | 90.00 |
| `HR-MRT-BLK-S` | `mens-race-tee` | S | Black | 90.00 |
| `HR-MRT-BLK-M` | `mens-race-tee` | M | Black | 90.00 |
| `HR-MRT-BLK-L` | `mens-race-tee` | L | Black | 90.00 |
| `HR-MRT-BLK-XL` | `mens-race-tee` | XL | Black | 90.00 |
| `HR-MRT-BLK-XXL` | `mens-race-tee` | XXL | Black | 90.00 |
| `HR-MRT-SLV-XS` | `mens-race-tee` | XS | Silver | 90.00 |
| `HR-MRT-SLV-S` | `mens-race-tee` | S | Silver | 90.00 |
| `HR-MRT-SLV-M` | `mens-race-tee` | M | Silver | 90.00 |
| `HR-MRT-SLV-L` | `mens-race-tee` | L | Silver | 90.00 |
| `HR-MRT-SLV-XL` | `mens-race-tee` | XL | Silver | 90.00 |
| `HR-MRT-SLV-XXL` | `mens-race-tee` | XXL | Silver | 90.00 |
| `HR-WRT-BLK-XS` | `womens-race-tee` | XS | Black | 90.00 |
| `HR-WRT-BLK-S` | `womens-race-tee` | S | Black | 90.00 |
| `HR-WRT-BLK-M` | `womens-race-tee` | M | Black | 90.00 |
| `HR-WRT-BLK-L` | `womens-race-tee` | L | Black | 90.00 |
| `HR-WRT-BLK-XL` | `womens-race-tee` | XL | Black | 90.00 |
| `HR-WRT-SLV-XS` | `womens-race-tee` | XS | Silver | 90.00 |
| `HR-WRT-SLV-S` | `womens-race-tee` | S | Silver | 90.00 |
| `HR-WRT-SLV-M` | `womens-race-tee` | M | Silver | 90.00 |
| `HR-WRT-SLV-L` | `womens-race-tee` | L | Silver | 90.00 |
| `HR-WRT-SLV-XL` | `womens-race-tee` | XL | Silver | 90.00 |
| `HR-METT-GRY-XS` | `mens-eco-tech-tee` | XS | Grey | 85.00 |
| `HR-METT-GRY-S` | `mens-eco-tech-tee` | S | Grey | 85.00 |
| `HR-METT-GRY-M` | `mens-eco-tech-tee` | M | Grey | 85.00 |
| `HR-METT-GRY-L` | `mens-eco-tech-tee` | L | Grey | 85.00 |
| `HR-METT-GRY-XL` | `mens-eco-tech-tee` | XL | Grey | 85.00 |
| `HR-METT-GRY-XXL` | `mens-eco-tech-tee` | XXL | Grey | 85.00 |
| `HR-METT-YEL-XS` | `mens-eco-tech-tee` | XS | Yellow | 85.00 |
| `HR-METT-YEL-S` | `mens-eco-tech-tee` | S | Yellow | 85.00 |
| `HR-METT-YEL-M` | `mens-eco-tech-tee` | M | Yellow | 85.00 |
| `HR-METT-YEL-L` | `mens-eco-tech-tee` | L | Yellow | 85.00 |
| `HR-METT-YEL-XL` | `mens-eco-tech-tee` | XL | Yellow | 85.00 |
| `HR-METT-YEL-XXL` | `mens-eco-tech-tee` | XXL | Yellow | 85.00 |
| `HR-WETT-GRY-XS` | `womens-eco-tech-tee` | XS | Grey | 85.00 |
| `HR-WETT-GRY-S` | `womens-eco-tech-tee` | S | Grey | 85.00 |
| `HR-WETT-GRY-M` | `womens-eco-tech-tee` | M | Grey | 85.00 |
| `HR-WETT-GRY-L` | `womens-eco-tech-tee` | L | Grey | 85.00 |
| `HR-WETT-GRY-XL` | `womens-eco-tech-tee` | XL | Grey | 85.00 |
| `HR-WETT-CRM-XS` | `womens-eco-tech-tee` | XS | Cream | 85.00 |
| `HR-WETT-CRM-S` | `womens-eco-tech-tee` | S | Cream | 85.00 |
| `HR-WETT-CRM-M` | `womens-eco-tech-tee` | M | Cream | 85.00 |
| `HR-WETT-CRM-L` | `womens-eco-tech-tee` | L | Cream | 85.00 |
| `HR-WETT-CRM-XL` | `womens-eco-tech-tee` | XL | Cream | 85.00 |
| `HR-MHWT-WBS-XS` | `mens-hot-weather-tee` | XS | White/Blue Stripe | 105.00 |
| `HR-MHWT-WBS-S` | `mens-hot-weather-tee` | S | White/Blue Stripe | 105.00 |
| `HR-MHWT-WBS-M` | `mens-hot-weather-tee` | M | White/Blue Stripe | 105.00 |
| `HR-MHWT-WBS-L` | `mens-hot-weather-tee` | L | White/Blue Stripe | 105.00 |
| `HR-MHWT-WBS-XL` | `mens-hot-weather-tee` | XL | White/Blue Stripe | 105.00 |
| `HR-MHWT-WBS-XXL` | `mens-hot-weather-tee` | XXL | White/Blue Stripe | 105.00 |
| `HR-MHWT-GNS-XS` | `mens-hot-weather-tee` | XS | Grey/Navy Stripe | 105.00 |
| `HR-MHWT-GNS-S` | `mens-hot-weather-tee` | S | Grey/Navy Stripe | 105.00 |
| `HR-MHWT-GNS-M` | `mens-hot-weather-tee` | M | Grey/Navy Stripe | 105.00 |
| `HR-MHWT-GNS-L` | `mens-hot-weather-tee` | L | Grey/Navy Stripe | 105.00 |
| `HR-MHWT-GNS-XL` | `mens-hot-weather-tee` | XL | Grey/Navy Stripe | 105.00 |
| `HR-MHWT-GNS-XXL` | `mens-hot-weather-tee` | XXL | Grey/Navy Stripe | 105.00 |
| `HR-WHWT-WBS-XS` | `womens-hot-weather-tee` | XS | White/Blue Stripe | 105.00 |
| `HR-WHWT-WBS-S` | `womens-hot-weather-tee` | S | White/Blue Stripe | 105.00 |
| `HR-WHWT-WBS-M` | `womens-hot-weather-tee` | M | White/Blue Stripe | 105.00 |
| `HR-WHWT-WBS-L` | `womens-hot-weather-tee` | L | White/Blue Stripe | 105.00 |
| `HR-WHWT-WBS-XL` | `womens-hot-weather-tee` | XL | White/Blue Stripe | 105.00 |
| `HR-WHWT-WGY-XS` | `womens-hot-weather-tee` | XS | Warm Grey/Yellow | 105.00 |
| `HR-WHWT-WGY-S` | `womens-hot-weather-tee` | S | Warm Grey/Yellow | 105.00 |
| `HR-WHWT-WGY-M` | `womens-hot-weather-tee` | M | Warm Grey/Yellow | 105.00 |
| `HR-WHWT-WGY-L` | `womens-hot-weather-tee` | L | Warm Grey/Yellow | 105.00 |
| `HR-WHWT-WGY-XL` | `womens-hot-weather-tee` | XL | Warm Grey/Yellow | 105.00 |
| `HR-MRV-WHT-XS` | `mens-race-vest-2` | XS | White | 95.00 |
| `HR-MRV-WHT-S` | `mens-race-vest-2` | S | White | 95.00 |
| `HR-MRV-WHT-M` | `mens-race-vest-2` | M | White | 95.00 |
| `HR-MRV-WHT-L` | `mens-race-vest-2` | L | White | 95.00 |
| `HR-MRV-WHT-XL` | `mens-race-vest-2` | XL | White | 95.00 |
| `HR-MRV-WHT-XXL` | `mens-race-vest-2` | XXL | White | 95.00 |
| `HR-MRV-BLK-XS` | `mens-race-vest-2` | XS | Black | 95.00 |
| `HR-MRV-BLK-S` | `mens-race-vest-2` | S | Black | 95.00 |
| `HR-MRV-BLK-M` | `mens-race-vest-2` | M | Black | 95.00 |
| `HR-MRV-BLK-L` | `mens-race-vest-2` | L | Black | 95.00 |
| `HR-MRV-BLK-XL` | `mens-race-vest-2` | XL | Black | 95.00 |
| `HR-MRV-BLK-XXL` | `mens-race-vest-2` | XXL | Black | 95.00 |
| `HR-MRV-GRN-XS` | `mens-race-vest-2` | XS | Bright Green | 95.00 |
| `HR-MRV-GRN-S` | `mens-race-vest-2` | S | Bright Green | 95.00 |
| `HR-MRV-GRN-M` | `mens-race-vest-2` | M | Bright Green | 95.00 |
| `HR-MRV-GRN-L` | `mens-race-vest-2` | L | Bright Green | 95.00 |
| `HR-MRV-GRN-XL` | `mens-race-vest-2` | XL | Bright Green | 95.00 |
| `HR-MRV-GRN-XXL` | `mens-race-vest-2` | XXL | Bright Green | 95.00 |
| `HR-WRV-BLK-XS` | `womens-race-vest` | XS | Black | 95.00 |
| `HR-WRV-BLK-S` | `womens-race-vest` | S | Black | 95.00 |
| `HR-WRV-BLK-M` | `womens-race-vest` | M | Black | 95.00 |
| `HR-WRV-BLK-L` | `womens-race-vest` | L | Black | 95.00 |
| `HR-WRV-BLK-XL` | `womens-race-vest` | XL | Black | 95.00 |
| `HR-WRV-WHT-XS` | `womens-race-vest` | XS | White | 95.00 |
| `HR-WRV-WHT-S` | `womens-race-vest` | S | White | 95.00 |
| `HR-WRV-WHT-M` | `womens-race-vest` | M | White | 95.00 |
| `HR-WRV-WHT-L` | `womens-race-vest` | L | White | 95.00 |
| `HR-WRV-WHT-XL` | `womens-race-vest` | XL | White | 95.00 |
| `HR-WCRV-BLK-XS` | `womens-crop-race-vest` | XS | Black | 80.00 |
| `HR-WCRV-BLK-S` | `womens-crop-race-vest` | S | Black | 80.00 |
| `HR-WCRV-BLK-M` | `womens-crop-race-vest` | M | Black | 80.00 |
| `HR-WCRV-BLK-L` | `womens-crop-race-vest` | L | Black | 80.00 |
| `HR-MSG-WBS-XS` | `mens-training-singlet` | XS | White/Blue Stripe | 95.00 |
| `HR-MSG-WBS-S` | `mens-training-singlet` | S | White/Blue Stripe | 95.00 |
| `HR-MSG-WBS-M` | `mens-training-singlet` | M | White/Blue Stripe | 95.00 |
| `HR-MSG-WBS-L` | `mens-training-singlet` | L | White/Blue Stripe | 95.00 |
| `HR-MSG-WBS-XL` | `mens-training-singlet` | XL | White/Blue Stripe | 95.00 |
| `HR-MSG-WBS-XXL` | `mens-training-singlet` | XXL | White/Blue Stripe | 95.00 |
| `HR-MSG-GNS-XS` | `mens-training-singlet` | XS | Grey/Navy Stripe | 95.00 |
| `HR-MSG-GNS-S` | `mens-training-singlet` | S | Grey/Navy Stripe | 95.00 |
| `HR-MSG-GNS-M` | `mens-training-singlet` | M | Grey/Navy Stripe | 95.00 |
| `HR-MSG-GNS-L` | `mens-training-singlet` | L | Grey/Navy Stripe | 95.00 |
| `HR-MSG-GNS-XL` | `mens-training-singlet` | XL | Grey/Navy Stripe | 95.00 |
| `HR-MSG-GNS-XXL` | `mens-training-singlet` | XXL | Grey/Navy Stripe | 95.00 |
| `HR-MERV-FLB-XS` | `mens-elite-race-vest` | XS | Fluro/Light Blue | 190.00 |
| `HR-MERV-FLB-S` | `mens-elite-race-vest` | S | Fluro/Light Blue | 190.00 |
| `HR-MERV-FLB-M` | `mens-elite-race-vest` | M | Fluro/Light Blue | 190.00 |
| `HR-MERV-FLB-L` | `mens-elite-race-vest` | L | Fluro/Light Blue | 190.00 |
| `HR-MERV-FLB-XL` | `mens-elite-race-vest` | XL | Fluro/Light Blue | 190.00 |
| `HR-MERV-FLB-XXL` | `mens-elite-race-vest` | XXL | Fluro/Light Blue | 190.00 |
| `HR-MLST-GRY-XS` | `mens-long-sleeve-tech-tee` | XS | Grey | 100.00 |
| `HR-MLST-GRY-S` | `mens-long-sleeve-tech-tee` | S | Grey | 100.00 |
| `HR-MLST-GRY-M` | `mens-long-sleeve-tech-tee` | M | Grey | 100.00 |
| `HR-MLST-GRY-L` | `mens-long-sleeve-tech-tee` | L | Grey | 100.00 |
| `HR-MLST-GRY-XL` | `mens-long-sleeve-tech-tee` | XL | Grey | 100.00 |
| `HR-MLST-GRY-XXL` | `mens-long-sleeve-tech-tee` | XXL | Grey | 100.00 |
| `HR-MLST-BRN-XS` | `mens-long-sleeve-tech-tee` | XS | Dark Brown | 100.00 |
| `HR-MLST-BRN-S` | `mens-long-sleeve-tech-tee` | S | Dark Brown | 100.00 |
| `HR-MLST-BRN-M` | `mens-long-sleeve-tech-tee` | M | Dark Brown | 100.00 |
| `HR-MLST-BRN-L` | `mens-long-sleeve-tech-tee` | L | Dark Brown | 100.00 |
| `HR-MLST-BRN-XL` | `mens-long-sleeve-tech-tee` | XL | Dark Brown | 100.00 |
| `HR-MLST-BRN-XXL` | `mens-long-sleeve-tech-tee` | XXL | Dark Brown | 100.00 |
| `HR-WLST-GRY-XS` | `womens-long-sleeve-tech-tee` | XS | Grey | 100.00 |
| `HR-WLST-GRY-S` | `womens-long-sleeve-tech-tee` | S | Grey | 100.00 |
| `HR-WLST-GRY-M` | `womens-long-sleeve-tech-tee` | M | Grey | 100.00 |
| `HR-WLST-GRY-L` | `womens-long-sleeve-tech-tee` | L | Grey | 100.00 |
| `HR-WLST-GRY-XL` | `womens-long-sleeve-tech-tee` | XL | Grey | 100.00 |
| `HR-WLST-CRM-XS` | `womens-long-sleeve-tech-tee` | XS | Cream | 100.00 |
| `HR-WLST-CRM-S` | `womens-long-sleeve-tech-tee` | S | Cream | 100.00 |
| `HR-WLST-CRM-M` | `womens-long-sleeve-tech-tee` | M | Cream | 100.00 |
| `HR-WLST-CRM-L` | `womens-long-sleeve-tech-tee` | L | Cream | 100.00 |
| `HR-WLST-CRM-XL` | `womens-long-sleeve-tech-tee` | XL | Cream | 100.00 |
| `HR-MTT-BLK-XS` | `mens-tempo-top` | XS | Black | 210.00 |
| `HR-MTT-BLK-S` | `mens-tempo-top` | S | Black | 210.00 |
| `HR-MTT-BLK-M` | `mens-tempo-top` | M | Black | 210.00 |
| `HR-MTT-BLK-L` | `mens-tempo-top` | L | Black | 210.00 |
| `HR-MTT-BLK-XL` | `mens-tempo-top` | XL | Black | 210.00 |
| `HR-MTT-BLK-XXL` | `mens-tempo-top` | XXL | Black | 210.00 |
| `HR-MTT-BRN-XS` | `mens-tempo-top` | XS | Dark Brown | 210.00 |
| `HR-MTT-BRN-S` | `mens-tempo-top` | S | Dark Brown | 210.00 |
| `HR-MTT-BRN-M` | `mens-tempo-top` | M | Dark Brown | 210.00 |
| `HR-MTT-BRN-L` | `mens-tempo-top` | L | Dark Brown | 210.00 |
| `HR-MTT-BRN-XL` | `mens-tempo-top` | XL | Dark Brown | 210.00 |
| `HR-MTT-BRN-XXL` | `mens-tempo-top` | XXL | Dark Brown | 210.00 |
| `HR-MMBL-GRY-XS` | `mens-merino-silk-base-layer-ls` | XS | Grey | 95.00 |
| `HR-MMBL-GRY-S` | `mens-merino-silk-base-layer-ls` | S | Grey | 95.00 |
| `HR-MMBL-GRY-M` | `mens-merino-silk-base-layer-ls` | M | Grey | 95.00 |
| `HR-MMBL-GRY-L` | `mens-merino-silk-base-layer-ls` | L | Grey | 95.00 |
| `HR-MMBL-GRY-XL` | `mens-merino-silk-base-layer-ls` | XL | Grey | 95.00 |
| `HR-MMBL-GRY-XXL` | `mens-merino-silk-base-layer-ls` | XXL | Grey | 95.00 |
| `HR-MMBL-FOR-XS` | `mens-merino-silk-base-layer-ls` | XS | Forest Night | 95.00 |
| `HR-MMBL-FOR-S` | `mens-merino-silk-base-layer-ls` | S | Forest Night | 95.00 |
| `HR-MMBL-FOR-M` | `mens-merino-silk-base-layer-ls` | M | Forest Night | 95.00 |
| `HR-MMBL-FOR-L` | `mens-merino-silk-base-layer-ls` | L | Forest Night | 95.00 |
| `HR-MMBL-FOR-XL` | `mens-merino-silk-base-layer-ls` | XL | Forest Night | 95.00 |
| `HR-MMBL-FOR-XXL` | `mens-merino-silk-base-layer-ls` | XXL | Forest Night | 95.00 |
| `HR-WMBL-GRY-XS` | `womens-merino-silk-base-layer-ls` | XS | Grey | 95.00 |
| `HR-WMBL-GRY-S` | `womens-merino-silk-base-layer-ls` | S | Grey | 95.00 |
| `HR-WMBL-GRY-M` | `womens-merino-silk-base-layer-ls` | M | Grey | 95.00 |
| `HR-WMBL-GRY-L` | `womens-merino-silk-base-layer-ls` | L | Grey | 95.00 |
| `HR-WMBL-GRY-XL` | `womens-merino-silk-base-layer-ls` | XL | Grey | 95.00 |
| `HR-WMBL-BIR-XS` | `womens-merino-silk-base-layer-ls` | XS | Blue Iris | 95.00 |
| `HR-WMBL-BIR-S` | `womens-merino-silk-base-layer-ls` | S | Blue Iris | 95.00 |
| `HR-WMBL-BIR-M` | `womens-merino-silk-base-layer-ls` | M | Blue Iris | 95.00 |
| `HR-WMBL-BIR-L` | `womens-merino-silk-base-layer-ls` | L | Blue Iris | 95.00 |
| `HR-WMBL-BIR-XL` | `womens-merino-silk-base-layer-ls` | XL | Blue Iris | 95.00 |
| `HR-MTH-BGY-XS` | `mens-thermal-top` | XS | Blue Grey | 140.00 |
| `HR-MTH-BGY-S` | `mens-thermal-top` | S | Blue Grey | 140.00 |
| `HR-MTH-BGY-M` | `mens-thermal-top` | M | Blue Grey | 140.00 |
| `HR-MTH-BGY-L` | `mens-thermal-top` | L | Blue Grey | 140.00 |
| `HR-MTH-BGY-XL` | `mens-thermal-top` | XL | Blue Grey | 140.00 |
| `HR-MTH-BGY-XXL` | `mens-thermal-top` | XXL | Blue Grey | 140.00 |
| `HR-MAWJ-BLK-XS` | `mens-all-weather-jacket` | XS | Black | 370.00 |
| `HR-MAWJ-BLK-S` | `mens-all-weather-jacket` | S | Black | 370.00 |
| `HR-MAWJ-BLK-M` | `mens-all-weather-jacket` | M | Black | 370.00 |
| `HR-MAWJ-BLK-L` | `mens-all-weather-jacket` | L | Black | 370.00 |
| `HR-MAWJ-BLK-XL` | `mens-all-weather-jacket` | XL | Black | 370.00 |
| `HR-MAWJ-BLK-XXL` | `mens-all-weather-jacket` | XXL | Black | 370.00 |
| `HR-MPRS-ORG-XS` | `mens-packable-rain-shell` | XS | Orange | 220.00 |
| `HR-MPRS-ORG-S` | `mens-packable-rain-shell` | S | Orange | 220.00 |
| `HR-MPRS-ORG-M` | `mens-packable-rain-shell` | M | Orange | 220.00 |
| `HR-MPRS-ORG-L` | `mens-packable-rain-shell` | L | Orange | 220.00 |
| `HR-MPRS-ORG-XL` | `mens-packable-rain-shell` | XL | Orange | 220.00 |
| `HR-MPRS-ORG-XXL` | `mens-packable-rain-shell` | XXL | Orange | 220.00 |
| `HR-MPRS-BLK-XS` | `mens-packable-rain-shell` | XS | Black | 220.00 |
| `HR-MPRS-BLK-S` | `mens-packable-rain-shell` | S | Black | 220.00 |
| `HR-MPRS-BLK-M` | `mens-packable-rain-shell` | M | Black | 220.00 |
| `HR-MPRS-BLK-L` | `mens-packable-rain-shell` | L | Black | 220.00 |
| `HR-MPRS-BLK-XL` | `mens-packable-rain-shell` | XL | Black | 220.00 |
| `HR-MPRS-BLK-XXL` | `mens-packable-rain-shell` | XXL | Black | 220.00 |
| `HR-WPRS-ORG-XS` | `womens-packable-rain-shell` | XS | Orange | 220.00 |
| `HR-WPRS-ORG-S` | `womens-packable-rain-shell` | S | Orange | 220.00 |
| `HR-WPRS-ORG-M` | `womens-packable-rain-shell` | M | Orange | 220.00 |
| `HR-WPRS-ORG-L` | `womens-packable-rain-shell` | L | Orange | 220.00 |
| `HR-WPRS-ORG-XL` | `womens-packable-rain-shell` | XL | Orange | 220.00 |
| `HR-WPRS-BLK-XS` | `womens-packable-rain-shell` | XS | Black | 220.00 |
| `HR-WPRS-BLK-S` | `womens-packable-rain-shell` | S | Black | 220.00 |
| `HR-WPRS-BLK-M` | `womens-packable-rain-shell` | M | Black | 220.00 |
| `HR-WPRS-BLK-L` | `womens-packable-rain-shell` | L | Black | 220.00 |
| `HR-WPRS-BLK-XL` | `womens-packable-rain-shell` | XL | Black | 220.00 |
| `HR-MWB-NAV-XS` | `mens-windbreaker` | XS | Navy | 245.00 |
| `HR-MWB-NAV-S` | `mens-windbreaker` | S | Navy | 245.00 |
| `HR-MWB-NAV-M` | `mens-windbreaker` | M | Navy | 245.00 |
| `HR-MWB-NAV-L` | `mens-windbreaker` | L | Navy | 245.00 |
| `HR-MWB-NAV-XL` | `mens-windbreaker` | XL | Navy | 245.00 |
| `HR-MWB-NAV-XXL` | `mens-windbreaker` | XXL | Navy | 245.00 |
| `HR-MWB-BLK-XS` | `mens-windbreaker` | XS | Black | 245.00 |
| `HR-MWB-BLK-S` | `mens-windbreaker` | S | Black | 245.00 |
| `HR-MWB-BLK-M` | `mens-windbreaker` | M | Black | 245.00 |
| `HR-MWB-BLK-L` | `mens-windbreaker` | L | Black | 245.00 |
| `HR-MWB-BLK-XL` | `mens-windbreaker` | XL | Black | 245.00 |
| `HR-MWB-BLK-XXL` | `mens-windbreaker` | XXL | Black | 245.00 |
| `HR-WWB-OPL-XS` | `womens-windbreaker` | XS | Opal Grey | 245.00 |
| `HR-WWB-OPL-S` | `womens-windbreaker` | S | Opal Grey | 245.00 |
| `HR-WWB-OPL-M` | `womens-windbreaker` | M | Opal Grey | 245.00 |
| `HR-WWB-OPL-L` | `womens-windbreaker` | L | Opal Grey | 245.00 |
| `HR-WWB-OPL-XL` | `womens-windbreaker` | XL | Opal Grey | 245.00 |
| `HR-WWB-BLK-XS` | `womens-windbreaker` | XS | Black | 245.00 |
| `HR-WWB-BLK-S` | `womens-windbreaker` | S | Black | 245.00 |
| `HR-WWB-BLK-M` | `womens-windbreaker` | M | Black | 245.00 |
| `HR-WWB-BLK-L` | `womens-windbreaker` | L | Black | 245.00 |
| `HR-WWB-BLK-XL` | `womens-windbreaker` | XL | Black | 245.00 |
| `HR-MGL-BLK-XS` | `mens-showerproof-gilet` | XS | Black | 190.00 |
| `HR-MGL-BLK-S` | `mens-showerproof-gilet` | S | Black | 190.00 |
| `HR-MGL-BLK-M` | `mens-showerproof-gilet` | M | Black | 190.00 |
| `HR-MGL-BLK-L` | `mens-showerproof-gilet` | L | Black | 190.00 |
| `HR-MGL-BLK-XL` | `mens-showerproof-gilet` | XL | Black | 190.00 |
| `HR-MGL-BLK-XXL` | `mens-showerproof-gilet` | XXL | Black | 190.00 |
| `HR-MGL-ECR-XS` | `mens-showerproof-gilet` | XS | Ecru | 190.00 |
| `HR-MGL-ECR-S` | `mens-showerproof-gilet` | S | Ecru | 190.00 |
| `HR-MGL-ECR-M` | `mens-showerproof-gilet` | M | Ecru | 190.00 |
| `HR-MGL-ECR-L` | `mens-showerproof-gilet` | L | Ecru | 190.00 |
| `HR-MGL-ECR-XL` | `mens-showerproof-gilet` | XL | Ecru | 190.00 |
| `HR-MGL-ECR-XXL` | `mens-showerproof-gilet` | XXL | Ecru | 190.00 |
| `HR-MIJ-BLK-XS` | `mens-insulated-run-jacket` | XS | Black | 375.00 |
| `HR-MIJ-BLK-S` | `mens-insulated-run-jacket` | S | Black | 375.00 |
| `HR-MIJ-BLK-M` | `mens-insulated-run-jacket` | M | Black | 375.00 |
| `HR-MIJ-BLK-L` | `mens-insulated-run-jacket` | L | Black | 375.00 |
| `HR-MIJ-BLK-XL` | `mens-insulated-run-jacket` | XL | Black | 375.00 |
| `HR-MIJ-BLK-XXL` | `mens-insulated-run-jacket` | XXL | Black | 375.00 |
| `HR-MMS-BLK-XS` | `mens-marathon-shorts` | XS | Black | 180.00 |
| `HR-MMS-BLK-S` | `mens-marathon-shorts` | S | Black | 180.00 |
| `HR-MMS-BLK-M` | `mens-marathon-shorts` | M | Black | 180.00 |
| `HR-MMS-BLK-L` | `mens-marathon-shorts` | L | Black | 180.00 |
| `HR-MMS-BLK-XL` | `mens-marathon-shorts` | XL | Black | 180.00 |
| `HR-MMS-BLK-XXL` | `mens-marathon-shorts` | XXL | Black | 180.00 |
| `HR-MMS-SLV-XS` | `mens-marathon-shorts` | XS | Silver | 180.00 |
| `HR-MMS-SLV-S` | `mens-marathon-shorts` | S | Silver | 180.00 |
| `HR-MMS-SLV-M` | `mens-marathon-shorts` | M | Silver | 180.00 |
| `HR-MMS-SLV-L` | `mens-marathon-shorts` | L | Silver | 180.00 |
| `HR-MMS-SLV-XL` | `mens-marathon-shorts` | XL | Silver | 180.00 |
| `HR-MMS-SLV-XXL` | `mens-marathon-shorts` | XXL | Silver | 180.00 |
| `HR-WMS-BLK-XS` | `womens-marathon-shorts` | XS | Black | 180.00 |
| `HR-WMS-BLK-S` | `womens-marathon-shorts` | S | Black | 180.00 |
| `HR-WMS-BLK-M` | `womens-marathon-shorts` | M | Black | 180.00 |
| `HR-WMS-BLK-L` | `womens-marathon-shorts` | L | Black | 180.00 |
| `HR-WMS-BLK-XL` | `womens-marathon-shorts` | XL | Black | 180.00 |
| `HR-WMS-SLV-XS` | `womens-marathon-shorts` | XS | Silver | 180.00 |
| `HR-WMS-SLV-S` | `womens-marathon-shorts` | S | Silver | 180.00 |
| `HR-WMS-SLV-M` | `womens-marathon-shorts` | M | Silver | 180.00 |
| `HR-WMS-SLV-L` | `womens-marathon-shorts` | L | Silver | 180.00 |
| `HR-WMS-SLV-XL` | `womens-marathon-shorts` | XL | Silver | 180.00 |
| `HR-MRUN-BLK-XS` | `mens-run-shorts` | XS | Black | 100.00 |
| `HR-MRUN-BLK-S` | `mens-run-shorts` | S | Black | 100.00 |
| `HR-MRUN-BLK-M` | `mens-run-shorts` | M | Black | 100.00 |
| `HR-MRUN-BLK-L` | `mens-run-shorts` | L | Black | 100.00 |
| `HR-MRUN-BLK-XL` | `mens-run-shorts` | XL | Black | 100.00 |
| `HR-MRUN-BLK-XXL` | `mens-run-shorts` | XXL | Black | 100.00 |
| `HR-MRUN-BUR-XS` | `mens-run-shorts` | XS | Burgundy | 100.00 |
| `HR-MRUN-BUR-S` | `mens-run-shorts` | S | Burgundy | 100.00 |
| `HR-MRUN-BUR-M` | `mens-run-shorts` | M | Burgundy | 100.00 |
| `HR-MRUN-BUR-L` | `mens-run-shorts` | L | Burgundy | 100.00 |
| `HR-MRUN-BUR-XL` | `mens-run-shorts` | XL | Burgundy | 100.00 |
| `HR-MRUN-BUR-XXL` | `mens-run-shorts` | XXL | Burgundy | 100.00 |
| `HR-MSS-BLK-XS` | `mens-split-shorts` | XS | Black | 100.00 |
| `HR-MSS-BLK-S` | `mens-split-shorts` | S | Black | 100.00 |
| `HR-MSS-BLK-M` | `mens-split-shorts` | M | Black | 100.00 |
| `HR-MSS-BLK-L` | `mens-split-shorts` | L | Black | 100.00 |
| `HR-MSS-BLK-XL` | `mens-split-shorts` | XL | Black | 100.00 |
| `HR-MSS-BLK-XXL` | `mens-split-shorts` | XXL | Black | 100.00 |
| `HR-MSS-TAN-XS` | `mens-split-shorts` | XS | Tan | 100.00 |
| `HR-MSS-TAN-S` | `mens-split-shorts` | S | Tan | 100.00 |
| `HR-MSS-TAN-M` | `mens-split-shorts` | M | Tan | 100.00 |
| `HR-MSS-TAN-L` | `mens-split-shorts` | L | Tan | 100.00 |
| `HR-MSS-TAN-XL` | `mens-split-shorts` | XL | Tan | 100.00 |
| `HR-MSS-TAN-XXL` | `mens-split-shorts` | XXL | Tan | 100.00 |
| `HR-WSS-BLK-XS` | `womens-split-shorts` | XS | Black | 100.00 |
| `HR-WSS-BLK-S` | `womens-split-shorts` | S | Black | 100.00 |
| `HR-WSS-BLK-M` | `womens-split-shorts` | M | Black | 100.00 |
| `HR-WSS-BLK-L` | `womens-split-shorts` | L | Black | 100.00 |
| `HR-WSS-BLK-XL` | `womens-split-shorts` | XL | Black | 100.00 |
| `HR-WSS-BUR-XS` | `womens-split-shorts` | XS | Burgundy | 100.00 |
| `HR-WSS-BUR-S` | `womens-split-shorts` | S | Burgundy | 100.00 |
| `HR-WSS-BUR-M` | `womens-split-shorts` | M | Burgundy | 100.00 |
| `HR-WSS-BUR-L` | `womens-split-shorts` | L | Burgundy | 100.00 |
| `HR-WSS-BUR-XL` | `womens-split-shorts` | XL | Burgundy | 100.00 |
| `HR-WSP-BLK-XS` | `womens-speed-shorts` | XS | Black | 110.00 |
| `HR-WSP-BLK-S` | `womens-speed-shorts` | S | Black | 110.00 |
| `HR-WSP-BLK-M` | `womens-speed-shorts` | M | Black | 110.00 |
| `HR-WSP-BLK-L` | `womens-speed-shorts` | L | Black | 110.00 |
| `HR-WSP-BLK-XL` | `womens-speed-shorts` | XL | Black | 110.00 |
| `HR-WSP-NAV-XS` | `womens-speed-shorts` | XS | Navy | 110.00 |
| `HR-WSP-NAV-S` | `womens-speed-shorts` | S | Navy | 110.00 |
| `HR-WSP-NAV-M` | `womens-speed-shorts` | M | Navy | 110.00 |
| `HR-WSP-NAV-L` | `womens-speed-shorts` | L | Navy | 110.00 |
| `HR-WSP-NAV-XL` | `womens-speed-shorts` | XL | Navy | 110.00 |
| `HR-MTS-BLK-XS` | `mens-trail-shorts` | XS | Black | 170.00 |
| `HR-MTS-BLK-S` | `mens-trail-shorts` | S | Black | 170.00 |
| `HR-MTS-BLK-M` | `mens-trail-shorts` | M | Black | 170.00 |
| `HR-MTS-BLK-L` | `mens-trail-shorts` | L | Black | 170.00 |
| `HR-MTS-BLK-XL` | `mens-trail-shorts` | XL | Black | 170.00 |
| `HR-MTS-BLK-XXL` | `mens-trail-shorts` | XXL | Black | 170.00 |
| `HR-MTS-GDG-XS` | `mens-trail-shorts` | XS | Grey/Dark Grey | 170.00 |
| `HR-MTS-GDG-S` | `mens-trail-shorts` | S | Grey/Dark Grey | 170.00 |
| `HR-MTS-GDG-M` | `mens-trail-shorts` | M | Grey/Dark Grey | 170.00 |
| `HR-MTS-GDG-L` | `mens-trail-shorts` | L | Grey/Dark Grey | 170.00 |
| `HR-MTS-GDG-XL` | `mens-trail-shorts` | XL | Grey/Dark Grey | 170.00 |
| `HR-MTS-GDG-XXL` | `mens-trail-shorts` | XXL | Grey/Dark Grey | 170.00 |
| `HR-WTS-BLK-XS` | `womens-trail-shorts` | XS | Black | 170.00 |
| `HR-WTS-BLK-S` | `womens-trail-shorts` | S | Black | 170.00 |
| `HR-WTS-BLK-M` | `womens-trail-shorts` | M | Black | 170.00 |
| `HR-WTS-BLK-L` | `womens-trail-shorts` | L | Black | 170.00 |
| `HR-WTS-BLK-XL` | `womens-trail-shorts` | XL | Black | 170.00 |
| `HR-WTS-GDG-XS` | `womens-trail-shorts` | XS | Grey/Dark Grey | 170.00 |
| `HR-WTS-GDG-S` | `womens-trail-shorts` | S | Grey/Dark Grey | 170.00 |
| `HR-WTS-GDG-M` | `womens-trail-shorts` | M | Grey/Dark Grey | 170.00 |
| `HR-WTS-GDG-L` | `womens-trail-shorts` | L | Grey/Dark Grey | 170.00 |
| `HR-WTS-GDG-XL` | `womens-trail-shorts` | XL | Grey/Dark Grey | 170.00 |
| `HR-MHT-BLK-XS` | `mens-half-tights` | XS | Black | 115.00 |
| `HR-MHT-BLK-S` | `mens-half-tights` | S | Black | 115.00 |
| `HR-MHT-BLK-M` | `mens-half-tights` | M | Black | 115.00 |
| `HR-MHT-BLK-L` | `mens-half-tights` | L | Black | 115.00 |
| `HR-MHT-BLK-XL` | `mens-half-tights` | XL | Black | 115.00 |
| `HR-MHT-BLK-XXL` | `mens-half-tights` | XXL | Black | 115.00 |
| `HR-MHT-NAV-XS` | `mens-half-tights` | XS | Navy | 115.00 |
| `HR-MHT-NAV-S` | `mens-half-tights` | S | Navy | 115.00 |
| `HR-MHT-NAV-M` | `mens-half-tights` | M | Navy | 115.00 |
| `HR-MHT-NAV-L` | `mens-half-tights` | L | Navy | 115.00 |
| `HR-MHT-NAV-XL` | `mens-half-tights` | XL | Navy | 115.00 |
| `HR-MHT-NAV-XXL` | `mens-half-tights` | XXL | Navy | 115.00 |
| `HR-WHT-BLK-XS` | `womens-merino-half-tights` | XS | Black | 150.00 |
| `HR-WHT-BLK-S` | `womens-merino-half-tights` | S | Black | 150.00 |
| `HR-WHT-BLK-M` | `womens-merino-half-tights` | M | Black | 150.00 |
| `HR-WHT-BLK-L` | `womens-merino-half-tights` | L | Black | 150.00 |
| `HR-WHT-BLK-XL` | `womens-merino-half-tights` | XL | Black | 150.00 |
| `HR-MST-BLK-XS` | `mens-session-tights` | XS | Black | 160.00 |
| `HR-MST-BLK-S` | `mens-session-tights` | S | Black | 160.00 |
| `HR-MST-BLK-M` | `mens-session-tights` | M | Black | 160.00 |
| `HR-MST-BLK-L` | `mens-session-tights` | L | Black | 160.00 |
| `HR-MST-BLK-XL` | `mens-session-tights` | XL | Black | 160.00 |
| `HR-MST-BLK-XXL` | `mens-session-tights` | XXL | Black | 160.00 |
| `HR-WRTI-BLK-XS` | `womens-run-tights` | XS | Black | 175.00 |
| `HR-WRTI-BLK-S` | `womens-run-tights` | S | Black | 175.00 |
| `HR-WRTI-BLK-M` | `womens-run-tights` | M | Black | 175.00 |
| `HR-WRTI-BLK-L` | `womens-run-tights` | L | Black | 175.00 |
| `HR-WRTI-BLK-XL` | `womens-run-tights` | XL | Black | 175.00 |
| `HR-WRTI-DGY-XS` | `womens-run-tights` | XS | Dark Grey | 175.00 |
| `HR-WRTI-DGY-S` | `womens-run-tights` | S | Dark Grey | 175.00 |
| `HR-WRTI-DGY-M` | `womens-run-tights` | M | Dark Grey | 175.00 |
| `HR-WRTI-DGY-L` | `womens-run-tights` | L | Dark Grey | 175.00 |
| `HR-WRTI-DGY-XL` | `womens-run-tights` | XL | Dark Grey | 175.00 |
| `HR-MRTR-BLK-XS` | `mens-run-trousers` | XS | Black | 180.00 |
| `HR-MRTR-BLK-S` | `mens-run-trousers` | S | Black | 180.00 |
| `HR-MRTR-BLK-M` | `mens-run-trousers` | M | Black | 180.00 |
| `HR-MRTR-BLK-L` | `mens-run-trousers` | L | Black | 180.00 |
| `HR-MRTR-BLK-XL` | `mens-run-trousers` | XL | Black | 180.00 |
| `HR-MRTR-BLK-XXL` | `mens-run-trousers` | XXL | Black | 180.00 |
| `HR-RSK-WFY-S` | `race-socks` | S | White/Fluro Yellow | 24.00 |
| `HR-RSK-WFY-M` | `race-socks` | M | White/Fluro Yellow | 24.00 |
| `HR-RSK-WFY-L` | `race-socks` | L | White/Fluro Yellow | 24.00 |
| `HR-RSK-NRD-S` | `race-socks` | S | Navy/Red | 24.00 |
| `HR-RSK-NRD-M` | `race-socks` | M | Navy/Red | 24.00 |
| `HR-RSK-NRD-L` | `race-socks` | L | Navy/Red | 24.00 |
| `HR-MCS-CHA-S` | `merino-crew-socks` | S | Charcoal | 26.00 |
| `HR-MCS-CHA-M` | `merino-crew-socks` | M | Charcoal | 26.00 |
| `HR-MCS-CHA-L` | `merino-crew-socks` | L | Charcoal | 26.00 |
| `HR-MCS-CRG-S` | `merino-crew-socks` | S | Cream/Grey | 26.00 |
| `HR-MCS-CRG-M` | `merino-crew-socks` | M | Cream/Grey | 26.00 |
| `HR-MCS-CRG-L` | `merino-crew-socks` | L | Cream/Grey | 26.00 |
| `HR-ASK-BLK-S` | `ankle-socks` | S | Black | 20.00 |
| `HR-ASK-BLK-M` | `ankle-socks` | M | Black | 20.00 |
| `HR-ASK-BLK-L` | `ankle-socks` | L | Black | 20.00 |
| `HR-ASK-WHT-S` | `ankle-socks` | S | White | 20.00 |
| `HR-ASK-WHT-M` | `ankle-socks` | M | White | 20.00 |
| `HR-ASK-WHT-L` | `ankle-socks` | L | White | 20.00 |
| `HR-RCP-BKW-OS` | `run-cap` | One size | Black/White | 55.00 |
| `HR-RCP-SLT-OS` | `run-cap` | One size | Slate | 55.00 |
| `HR-BNE-GRY-OS` | `merino-silk-beanie` | One size | Grey | 45.00 |
| `HR-BNE-FOR-OS` | `merino-silk-beanie` | One size | Forest Night | 45.00 |
| `HR-NWM-GRY-OS` | `merino-silk-neck-warmer` | One size | Grey | 45.00 |
| `HR-ARM-BLK-S` | `arm-sleeves` | S | Black | 65.00 |
| `HR-ARM-BLK-M` | `arm-sleeves` | M | Black | 65.00 |
| `HR-ARM-BLK-L` | `arm-sleeves` | L | Black | 65.00 |
| `HR-GLV-BLK-S` | `winter-gloves` | S | Black | 50.00 |
| `HR-GLV-BLK-M` | `winter-gloves` | M | Black | 50.00 |
| `HR-GLV-BLK-L` | `winter-gloves` | L | Black | 50.00 |
| `HR-HBD-BLK-OS` | `headband` | One size | Black | 25.00 |
| `HR-TRP-BLK-XSS` | `trail-race-pack` | XS/S | Black | 260.00 |
| `HR-TRP-BLK-ML` | `trail-race-pack` | M/L | Black | 260.00 |
| `HR-TRP-BLK-XLXXL` | `trail-race-pack` | XL/XXL | Black | 260.00 |
| `HR-TRP-WHT-XSS` | `trail-race-pack` | XS/S | White | 260.00 |
| `HR-TRP-WHT-ML` | `trail-race-pack` | M/L | White | 260.00 |
| `HR-TRP-WHT-XLXXL` | `trail-race-pack` | XL/XXL | White | 260.00 |
