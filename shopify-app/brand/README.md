# Syndicate brand assets

Copied from the Syndicate identity pack v1 (`syndicate-brand-v1`). Its README is the brand guideline, and its `source/` generator can rebuild any size.

## In the app

`public/brand/` is served at `/brand/`:

| File | Used for |
|---|---|
| `syndicate-lockup-white.svg` | Admin header on charcoal, at 180px wide (the lockup minimum) |
| `syndicate-symbol-white.svg` | Admin header at 720px wide and below, at 32px |
| `syndicate-lockup-charcoal.svg` | Landing page (`/?stay=1`) |
| `syndicate-app-icon-dark.svg`, `-16.png`, `-32.png` | Favicon |
| `syndicate-app-icon-dark-256.png` | Apple touch icon |

Colour tokens are in `app/styles/shell.css` `:root`: charcoal `#252522`, cream `#F5F1E8`, warm grey `#8E8B83` and light grey `#CCC7BC`. Buttons and actions keep Shopify green (`--primary: #008060`). Secondary text uses `#6B6861`, a darker version of the warm grey, because `#8E8B83` on cream is only 3:1.

The app UI uses Manrope, the wordmark typeface, for body text and headings. `public/fonts/manrope-latin-var.woff2` is a Latin subset of the pack's variable font (weights 200–800), made with fontTools `pyftsubset`. Its SIL Open Font License is at `public/fonts/OFL.txt` and must stay with the font. The logo SVGs have outlined lettering and do not need the font.

## App icon (Dev Dashboard)

The app icon is set in the Shopify Dev Dashboard, not in `shopify.app.toml`. Upload one of these:

- `app-icon/syndicate-app-icon-dark-1024.png`: cream symbol on charcoal. Recommended, because it matches the admin header and stands out in Shopify's light admin navigation.
- `app-icon/syndicate-app-icon-light-1024.png`: charcoal symbol on cream.

The icons have square backgrounds and Shopify applies its own corner rounding. The pack does not claim to meet Shopify listing specifications. If the Dev Dashboard asks for a different size or format, re-export from the SVG next to each PNG.
