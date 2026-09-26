# Syndicate brand assets

These files come from the Syndicate identity pack v1.1 (`syndicate-brand-v1.1`). Its README is the brand guideline, and its `source/build.py` generator can rebuild any size.

v1.1 corrects the lockup alignment and adds cream variants and a favicon. v1 sized and centred the wordmark on its full ink box, including the descender. That left the lettering too large for the symbol and the capitals about 12% of the symbol height above its centre. The v1.1 lockup follows the pack's preview composition.

The admin design system (tokens, components, the tessellation pattern) lives in `app/styles/shell.css` and `app/components/Brand.tsx`.

## In the app

`public/brand/` is served at `/brand/`:

| File | Used for |
|---|---|
| `syndicate-wordmark-cream.svg` | Admin header, beside the inline `BrandSymbol` |
| `syndicate-lockup-cream.svg` | Landing page hero, on charcoal |
| `syndicate-favicon-16.png`, `-32.png`, `-48.png` | Favicon: the symbol at 88% of the tile, with seams opened for small sizes |
| `syndicate-app-icon-dark-256.png` | Apple touch icon (iOS applies its own corner mask) |
| Other lockups, wordmarks, symbols, app icons | Available for other uses. Lockups are v1.1. |

The header builds the lockup from the inline symbol and the wordmark image, so the symbol can animate. The CSS reproduces the v1.1 proportions:

- The symbol is 28px, which makes the hexagon 25.5px, above the 24px minimum.
- The wordmark's ink height is 0.77× the hexagon's height.
- The wordmark sits 8.4px from the hexagon (0.33×) and 1.25px below centre, so the lettering sits optically level.

Keep these ratios if you resize the header.

Cream is used on charcoal throughout, so the wordmark matches the cream symbol and header text.

## Type

Manrope, the wordmark typeface, is self-hosted as `public/fonts/manrope-latin-var.woff2`. This is a 35 KB Latin subset of the pack's variable font (weights 200–800), made with fontTools `pyftsubset`; the full TTF is 165 KB. Its SIL Open Font License is at `public/fonts/Manrope-OFL.txt` and must stay with the font.

## App icon (Dev Dashboard)

The app icon is set in the Shopify Dev Dashboard, not in `shopify.app.toml`. Upload one of these:

- `app-icon/syndicate-app-icon-dark-1024.png`: cream symbol on charcoal. Recommended, because it matches the admin header and stands out in Shopify's light admin navigation.
- `app-icon/syndicate-app-icon-light-1024.png`: charcoal symbol on cream.

The icons have square backgrounds and Shopify applies its own corner rounding. The pack does not claim to meet Shopify listing specifications. If the Dev Dashboard asks for a different size or format, re-export from the SVG next to each PNG.
