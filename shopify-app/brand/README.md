# Syndicate brand assets

Copied from the Syndicate identity pack v1.1 (`syndicate-brand-v1.1`). Its README is the brand guideline, and its `source/build.py` generator can rebuild any size. v1.1 fixes the lockup alignment and adds cream variants and a favicon (see the pack's changelog).

## In the app

`public/brand/` is served at `/brand/`:

| File | Used for |
|---|---|
| `syndicate-lockup-cream.svg` | Admin header on charcoal, at 180px wide (the lockup minimum) |
| `syndicate-symbol-cream.svg` | Admin header at 720px wide and below, at 32px |
| `syndicate-lockup-charcoal.svg` | Landing page (`/?stay=1`) |
| `syndicate-favicon-16.png`, `-32.png`, `-48.png` | Favicon |
| `syndicate-app-icon-dark-256.png` | Apple touch icon (iOS applies its own corner mask) |

The admin header is 56px high so the symbol keeps a quarter of its height clear above and below. A small negative margin lines the hexagon's flat left edge up with the text column.

## Colour

Tokens are in `app/styles/shell.css` `:root`.

| Role | Value |
|---|---|
| Charcoal: text and headings | `#252522` |
| Cream: page background, text on charcoal | `#F5F1E8` |
| Warm grey: disabled text | `#8E8B83` |
| Light grey: header secondary text | `#CCC7BC` |
| Shopify green: buttons, actions and success states only | `#008060` |

UI tints derived from the palette:

| Token | Value | Use |
|---|---|---|
| `--bg-canvas-deep` | `#EDE9DF` | Side navigation, bar tracks, disabled buttons |
| `--border` | `#E2DDD3` | Card, banner and input borders |
| `--bg-hover` | `#FAF8F3` | Hover states, graph background |
| `--text-subdued` | `#6B6861` | Secondary text. The brand warm grey is only 3:1 on cream; this is 4.9:1. |
| Demo badge | `#3A3935` | One step up from charcoal, inside the header |

Data accents, outside the brand palette:

| Token | Value | Use |
|---|---|---|
| `--navy` | `#1A2744` | Links and link titles, avatars, quiet buttons, high confidence, observed chips, graph nodes |
| `--kit-red` | `#A11D2A` | Low confidence, hypothesis chips, event candidates in the graph |
| Ochre | `#B86E2A` | Mid confidence |

Rules:

- **Green:** in the interface, only for actions (buttons) and success states ("Connected"). Info banners are neutral: white with a border. Warnings stay amber. The graph also uses green for observed links and Order nodes.
- **Data colours** (provenance chips, confidence bars, the graph) keep their own accent hues, listed above.

## Type

The app UI uses Manrope, the wordmark typeface, for body text and headings. `public/fonts/manrope-latin-var.woff2` is a Latin subset of the pack's variable font (weights 200–800), made with fontTools `pyftsubset`. Its SIL Open Font License is at `public/fonts/OFL.txt` and must stay with the font. Page titles are weight 700, one step lighter than the wordmark's 750 so they don't compete with the logo. Eyebrow labels are weight 600, uppercase, with 0.08em tracking.

## App icon (Dev Dashboard)

The app icon is set in the Shopify Dev Dashboard, not in `shopify.app.toml`. Upload one of these:

- `app-icon/syndicate-app-icon-dark-1024.png`: cream symbol on charcoal. Recommended, because it matches the admin header and stands out in Shopify's light admin navigation.
- `app-icon/syndicate-app-icon-light-1024.png`: charcoal symbol on cream.

The icons have square backgrounds and Shopify applies its own corner rounding. The pack does not claim to meet Shopify listing specifications. If the Dev Dashboard asks for a different size or format, re-export from the SVG next to each PNG.
