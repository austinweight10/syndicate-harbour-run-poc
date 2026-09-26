// Harbour Run product-image templates (flat-lay studio illustrations).
//
// Used by render_product_images.mjs. Every template draws into a 1000×1000
// SVG user space and returns { svg, fit? } — the renderer measures the art and
// scales/centres it so every product sits at the same visual size.
//
// Colour handling: palette names → hex live in PALETTE; makeColours() derives
// shade / deep / highlight / outline / stitch / trim tones from the base hex so
// every garment gets consistent shading without per-colour tuning.
//
// Original artwork only — no third-party marks. The only text is the tiny
// "HARBOUR RUN" mark.

// --------------------------------------------------------------------------- //
// Colour
// --------------------------------------------------------------------------- //

// Colour option value (products.csv Option2) → { base, accent?, stripe? }
export const PALETTE = {
  Black: { base: "#222428" },
  Silver: { base: "#b8bcc1" },
  Grey: { base: "#8d9095" },
  Yellow: { base: "#e7c23b" },
  Cream: { base: "#ebe1cb" },
  White: { base: "#fbfbf9" },
  "White/Blue Stripe": { base: "#fbfbf9", stripe: "#2f5ea8" },
  "Grey/Navy Stripe": { base: "#a3a6ab", stripe: "#1d2b4a" },
  "Warm Grey/Yellow": { base: "#a59c91", stripe: "#e7c23b" },
  "Bright Green": { base: "#3fc25c" },
  "Fluro/Light Blue": { base: "#d6ef3e", accent: "#86c3e8" },
  "Dark Brown": { base: "#4b3529" },
  "Forest Night": { base: "#2f3d34" },
  "Blue Iris": { base: "#5b62a3" },
  "Blue Grey": { base: "#6a7b8e" },
  Orange: { base: "#e9682b" },
  Navy: { base: "#1d2b4a" },
  "Opal Grey": { base: "#a9b2ae" },
  Ecru: { base: "#e2d7c0" },
  Burgundy: { base: "#6c2233" },
  Tan: { base: "#b8926d" },
  "Grey/Dark Grey": { base: "#8d9095", accent: "#46494e" },
  "Dark Grey": { base: "#46494e" },
  "White/Fluro Yellow": { base: "#fbfbf9", accent: "#d6ef3e" },
  "Navy/Red": { base: "#1d2b4a", accent: "#c8323c" },
  Charcoal: { base: "#3a3c40" },
  "Cream/Grey": { base: "#ebe1cb", accent: "#8d9095" },
  "Black/White": { base: "#222428", accent: "#f4f4f1" },
  Slate: { base: "#5a6570" },
};

export const BACKGROUND = "#F5F1E8";

export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
}

export function luminance(h) {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Derive the full tone set for a garment from its base colour.
export function makeColours(spec) {
  const base = spec.base;
  const L = luminance(base);
  const dark = L < 0.08;
  const light = L > 0.55;
  const c = {
    base,
    L,
    dark,
    light,
    shade: dark ? mix(base, "#000000", 0.3) : mix(base, "#000000", light ? 0.1 : 0.2),
    deep: dark ? mix(base, "#000000", 0.55) : mix(base, "#000000", light ? 0.28 : 0.42),
    hi: mix(base, "#ffffff", dark ? 0.12 : 0.22),
    outline: dark ? mix(base, "#000000", 0.4) : mix(base, "#3a3226", light ? 0.3 : 0.35),
    seam: dark ? mix(base, "#ffffff", 0.1) : mix(base, "#000000", light ? 0.16 : 0.25),
    stitch: dark ? mix(base, "#ffffff", 0.22) : mix(base, "#000000", light ? 0.22 : 0.3),
    trim: L < 0.3 ? "#ece7dc" : "#1d2433",
    mark: L < 0.3 ? "#e9e4d8" : "#1d2433",
    reflect: "#c9cdd2",
    accent: spec.accent || null,
    stripe: spec.stripe || null,
  };
  c.meshDot = dark ? mix(base, "#ffffff", 0.16) : mix(base, "#000000", light ? 0.2 : 0.3);
  c.fill = c.stripe ? "url(#stripes)" : base;
  // Secondary colour for panels/trims: explicit accent, else a tonal shade.
  c.panel = c.accent || c.shade;
  return c;
}

// --------------------------------------------------------------------------- //
// SVG helpers
// --------------------------------------------------------------------------- //

const M = (x) => 1000 - x;
let uid = 0;
const nextId = (p) => `${p}${++uid}`;

// Symmetric closed path: start on the centre line, describe the right half
// down to the centre line again; the left half is mirrored automatically.
export function sym(start, segs) {
  let d = `M${start[0]} ${start[1]}`;
  let cur = start;
  const starts = [];
  for (const s of segs) {
    starts.push(cur);
    if (s[0] === "L") {
      d += `L${s[1]} ${s[2]}`;
      cur = [s[1], s[2]];
    } else if (s[0] === "C") {
      d += `C${s.slice(1).join(" ")}`;
      cur = [s[5], s[6]];
    } else if (s[0] === "Q") {
      d += `Q${s.slice(1).join(" ")}`;
      cur = [s[3], s[4]];
    }
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const p0 = starts[i];
    if (s[0] === "L") d += `L${M(p0[0])} ${p0[1]}`;
    else if (s[0] === "C") d += `C${M(s[3])} ${s[4]} ${M(s[1])} ${s[2]} ${M(p0[0])} ${p0[1]}`;
    else if (s[0] === "Q") d += `Q${M(s[1])} ${s[2]} ${M(p0[0])} ${p0[1]}`;
  }
  return d + "Z";
}

// Draw markup plus its mirror image across x = 500.
const both = (s) => `${s}<g transform="matrix(-1 0 0 1 1000 0)">${s}</g>`;
const mirrorG = (s) => `<g transform="matrix(-1 0 0 1 1000 0)">${s}</g>`;

const P = (d, attrs) => `<path d="${d}" ${attrs}/>`;

function stitch(c, d, o = 0.9) {
  return P(d, `fill="none" stroke="${c.stitch}" stroke-width="2.2" stroke-dasharray="7 6" stroke-linecap="round" opacity="${o}"`);
}
function seam(c, d, w = 2.6, o = 0.85) {
  return P(d, `fill="none" stroke="${c.seam}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"`);
}
function hiFold(d, w = 26, o = 0.1) {
  return P(d, `fill="none" stroke="#ffffff" stroke-width="${w}" stroke-linecap="round" opacity="${o}" filter="url(#soft)"`);
}
function loFold(d, w = 26, o = 0.12) {
  return P(d, `fill="none" stroke="#000000" stroke-width="${w}" stroke-linecap="round" opacity="${o}" filter="url(#soft)"`);
}

function markText(c, x, y, { size: size0 = 13, rotate = 0, anchor = "middle", fill, opacity = 0.72 } = {}) {
  const size = size0 * 0.78;
  const t = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : "";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="700" font-size="${size}" letter-spacing="${size * 0.28}" fill="${fill || c.mark}" opacity="${opacity}"${t}>HARBOUR RUN</text>`;
}

// Reflective strip / dot.
function reflective(d, w = 8) {
  return P(d, `fill="none" stroke="url(#refl)" stroke-width="${w}" stroke-linecap="round"`);
}

// Vertical zip from (x, y1) to (x, y2).
function zip(c, x, y1, y2, { puller = true } = {}) {
  const tape = c.dark ? mix(c.base, "#000000", 0.45) : mix(c.base, "#000000", 0.35);
  const teeth = c.dark ? "#5b5e63" : mix(c.base, "#000000", 0.55);
  let s = `<rect x="${x - 8}" y="${y1}" width="16" height="${y2 - y1}" fill="${tape}" opacity="0.9"/>`;
  s += P(`M${x} ${y1 + 4}L${x} ${y2}`, `stroke="${teeth}" stroke-width="7" stroke-dasharray="2.4 2.4"`);
  s += stitch(c, `M${x - 14} ${y1 + 6}L${x - 14} ${y2}`, 0.7) + stitch(c, `M${x + 14} ${y1 + 6}L${x + 14} ${y2}`, 0.7);
  if (puller) {
    s += `<rect x="${x - 9}" y="${y1 + 4}" width="18" height="24" rx="4" fill="#2b2d31" stroke="#15161a" stroke-width="1.5"/>`;
    s += `<rect x="${x - 6}" y="${y1 + 24}" width="12" height="36" rx="5" fill="#34373c" stroke="#15161a" stroke-width="1.5"/>`;
    s += `<rect x="${x - 3}" y="${y1 + 30}" width="6" height="22" rx="3" fill="#1b1c20"/>`;
  }
  return s;
}

// Short zip between two points (pockets).
function zipLine(c, x1, y1, x2, y2) {
  const tape = mix(c.base, "#000000", c.dark ? 0.5 : 0.38);
  let s = P(`M${x1} ${y1}L${x2} ${y2}`, `stroke="${tape}" stroke-width="12" stroke-linecap="round"`);
  s += P(`M${x1} ${y1}L${x2} ${y2}`, `stroke="${c.dark ? "#5b5e63" : mix(c.base, "#000000", 0.6)}" stroke-width="5" stroke-dasharray="2 2"`);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  s += `<g transform="translate(${x1 + (x2 - x1) * 0.08} ${y1 + (y2 - y1) * 0.08}) rotate(${ang + 90})"><rect x="-5" y="-4" width="10" height="26" rx="4" fill="#2b2d31" stroke="#15161a" stroke-width="1.2"/></g>`;
  return s;
}

// Drawcord tails from eyelets at (x1,y) and (x2,y).
function drawcord(c, x1, x2, y, len = 110) {
  const cord = c.accent || c.trim;
  const cordEdge = mix(cord, "#000000", 0.3);
  let s = "";
  s += `<circle cx="${x1}" cy="${y}" r="7" fill="${c.deep}" stroke="${c.seam}" stroke-width="2"/>`;
  s += `<circle cx="${x2}" cy="${y}" r="7" fill="${c.deep}" stroke="${c.seam}" stroke-width="2"/>`;
  const t1 = `M${x1} ${y}C${x1 - 6} ${y + len * 0.35} ${x1 - 18} ${y + len * 0.7} ${x1 - 26} ${y + len}`;
  const t2 = `M${x2} ${y}C${x2 + 4} ${y + len * 0.3} ${x2 + 14} ${y + len * 0.65} ${x2 + 30} ${y + len * 0.95}`;
  for (const d of [t1, t2]) {
    s += P(d, `fill="none" stroke="${cordEdge}" stroke-width="9" stroke-linecap="round"`);
    s += P(d, `fill="none" stroke="${cord}" stroke-width="6" stroke-linecap="round"`);
  }
  s += `<rect x="${x1 - 32}" y="${y + len - 6}" width="11" height="20" rx="3" fill="${cordEdge}" transform="rotate(18 ${x1 - 26} ${y + len})"/>`;
  s += `<rect x="${x2 + 24}" y="${y + len * 0.95 - 6}" width="11" height="20" rx="3" fill="${cordEdge}" transform="rotate(-24 ${x2 + 30} ${y + len * 0.95})"/>`;
  return s;
}

// A garment piece: soft shadow, base fill, clipped patterns/shading/folds,
// outline, then unclipped details.
function piece(c, d, { under = "", inside = "", folds = "", over = "", fill, shadow = true, rim = true } = {}) {
  const id = nextId("clip");
  const f = fill || c.fill;
  let s = `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>`;
  s += under;
  s += P(d, `class="sil" fill="${f}" ${shadow ? 'filter="url(#shadow)"' : ""}`);
  s += `<g clip-path="url(#${id})">`;
  s += inside;
  s += `<rect x="0" y="0" width="1000" height="1000" fill="url(#sheen)"/>`;
  if (rim) s += P(d, `fill="none" stroke="${c.dark ? "#000000" : c.deep}" stroke-width="30" opacity="${c.dark ? 0.35 : 0.22}" filter="url(#soft)"`);
  s += folds;
  s += `</g>`;
  s += P(d, `fill="none" stroke="${c.outline}" stroke-width="2.4" stroke-linejoin="round" opacity="0.9"`);
  s += over;
  return s;
}

// Region with fill, clipped shading and seam outline (panels, cuffs, etc.)
function panel(c, d, fill, { stroke = true, pattern = "", opacity = 1 } = {}) {
  let s = P(d, `fill="${fill}" opacity="${opacity}"`);
  if (pattern) s += P(d, `fill="url(#${pattern})"`);
  if (stroke) s += P(d, `fill="none" stroke="${c.seam}" stroke-width="2.4" stroke-linejoin="round" opacity="0.85"`);
  return s;
}

// --------------------------------------------------------------------------- //
// Shared defs (per image)
// --------------------------------------------------------------------------- //

// Vignette as flat concentric bands (≤1 level per step). A real SVG gradient
// gets dithered by Skia, which quadruples PNG size for no visible gain.
export function background() {
  const stops = [
    [0, "#FAF7F0"],
    [0.55, BACKGROUND],
    [1, "#E9E2D3"],
  ];
  const at = (t) => {
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1];
        const [t1, c1] = stops[i];
        return mix(c0, c1, (t - t0) / (t1 - t0));
      }
    }
    return stops[stops.length - 1][1];
  };
  const N = 56;
  let s = `<rect width="1000" height="1000" fill="${at(1)}"/>`;
  for (let i = N - 1; i >= 1; i--) {
    const t = i / N;
    s += `<ellipse cx="500" cy="440" rx="${(t * 760).toFixed(1)}" ry="${(t * 760).toFixed(1)}" fill="${at(t)}" shape-rendering="crispEdges"/>`;
  }
  return s;
}

export function defs(c) {
  const stripe = c.stripe || c.base;
  return `
<defs>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="${c.dark ? 0.16 : 0.12}"/>
    <stop offset="0.42" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="0.66" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="${c.light ? 0.1 : 0.16}"/>
  </linearGradient>
  <linearGradient id="refl" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#eef0f2"/>
    <stop offset="0.5" stop-color="#b9bec4"/>
    <stop offset="1" stop-color="#dfe2e5"/>
  </linearGradient>
  <linearGradient id="vfade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
  </linearGradient>
  <filter id="shadow" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="b1"/>
    <feOffset in="b1" dx="4" dy="18" result="o1"/>
    <feFlood flood-color="#4a3a24" flood-opacity="0.2"/>
    <feComposite in2="o1" operator="in" result="s1"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b2"/>
    <feOffset in="b2" dx="1" dy="4" result="o2"/>
    <feFlood flood-color="#3a2d1c" flood-opacity="0.22"/>
    <feComposite in2="o2" operator="in" result="s2"/>
    <feMerge><feMergeNode in="s1"/><feMergeNode in="s2"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="soft" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="softer" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1600"><feGaussianBlur stdDeviation="3"/></filter>
  <pattern id="stripes" width="40" height="34" patternUnits="userSpaceOnUse">
    <rect width="40" height="34" fill="${c.base}"/>
    <rect y="12" width="40" height="9" fill="${stripe}"/>
  </pattern>
  <pattern id="mesh" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <circle cx="6" cy="6" r="2.5" fill="${c.meshDot}" opacity="0.75"/>
  </pattern>
  <pattern id="perf" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <circle cx="11" cy="11" r="2.2" fill="${c.meshDot}" opacity="0.55"/>
  </pattern>
  <pattern id="ribV" width="12" height="12" patternUnits="userSpaceOnUse">
    <rect x="0" width="4" height="12" fill="#000000" opacity="${c.dark ? 0.3 : 0.1}"/>
    <rect x="6" width="2" height="12" fill="#ffffff" opacity="${c.dark ? 0.07 : 0.12}"/>
  </pattern>
  <pattern id="ribH" width="12" height="11" patternUnits="userSpaceOnUse">
    <rect y="0" width="12" height="3.5" fill="#000000" opacity="${c.dark ? 0.3 : 0.1}"/>
    <rect y="6" width="12" height="2" fill="#ffffff" opacity="${c.dark ? 0.07 : 0.12}"/>
  </pattern>
  <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
    <path d="M0 0H18M0 0V18" stroke="#000000" stroke-width="2" opacity="${c.dark ? 0.28 : 0.11}"/>
    <path d="M1.5 1.5H18M1.5 1.5V18" stroke="#ffffff" stroke-width="1" opacity="${c.dark ? 0.06 : 0.12}"/>
  </pattern>
  <linearGradient id="baffle" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0.22"/>
    <stop offset="0.18" stop-color="#ffffff" stop-opacity="${c.dark ? 0.12 : 0.16}"/>
    <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.26"/>
  </linearGradient>
  <pattern id="quilt" width="1000" height="68" patternUnits="userSpaceOnUse" y="16">
    <rect width="1000" height="68" fill="url(#baffle)"/>
  </pattern>
</defs>`;
}

// --------------------------------------------------------------------------- //
// Tops
// --------------------------------------------------------------------------- //

function crewNeck(c, { nsx = 568, nsy = 178, depth = 258, backY = 196, band = 17 } = {}) {
  const l = M(nsx);
  const front = `M${l} ${nsy}C${l + 8} ${depth - 22} ${470} ${depth - 2} 500 ${depth}C530 ${depth - 2} ${nsx - 8} ${depth - 22} ${nsx} ${nsy}`;
  const inside = `${front}C${nsx - 13} ${nsy + 12} 530 ${backY} 500 ${backY}C470 ${backY} ${l + 13} ${nsy + 12} ${l} ${nsy}Z`;
  let s = P(inside, `fill="${c.deep}"`);
  s += P(`M${l + 16} ${nsy + 6}C${l + 30} ${nsy + 18} 470 ${backY + 6} 500 ${backY + 6}C530 ${backY + 6} ${nsx - 30} ${nsy + 18} ${nsx - 16} ${nsy + 6}`, `fill="none" stroke="#000" stroke-width="10" opacity="0.18" filter="url(#softer)"`);
  const bandCol = c.stripe ? c.base : mix(c.base, c.dark ? "#ffffff" : "#000000", 0.06);
  s += P(front, `fill="none" stroke="${c.outline}" stroke-width="${band + 3}"`);
  s += P(front, `fill="none" stroke="${bandCol}" stroke-width="${band}"`);
  s += P(front, `fill="none" stroke="url(#ribV)" stroke-width="${band}" opacity="0.6"`);
  const st = `M${l - 6} ${nsy + 8}C${l + 4} ${depth - 6} ${468} ${depth + 16} 500 ${depth + 18}C532 ${depth + 16} ${nsx - 4} ${depth - 6} ${nsx + 6} ${nsy + 8}`;
  s += stitch(c, st);
  return s;
}

function teeShape(o) {
  const L = o.len;
  const segs = [
    ["C", 530, 196, 555, 190, 568, 178],
    ["L", o.spx, o.spy],
    ["C", o.spx + 42, o.spy + 16, o.sx - 46, o.sy - 52, o.sx, o.sy],
    ["L", o.hx, o.hy],
    ["C", o.hx - 20, o.hy - 8, o.uax + 16, o.uay + 4, o.uax, o.uay],
  ];
  if (o.fitted) {
    segs.push(["C", o.uax - 4, o.uay + 110, o.uax - 20, o.uay + 190, o.uax - 8, o.uay + 280]);
    segs.push(["C", o.uax, L - 90, o.uax + 12, L - 50, o.uax + 14, L]);
  } else {
    segs.push(["C", o.uax + 4, o.uay + 130, o.uax + 10, L - 150, o.uax + 12, L]);
  }
  segs.push(["C", 650, L + 12, 570, L + 16, 500, L + 16]);
  return sym([500, 196], segs);
}

export function tee(c, opts = {}) {
  const fitted = !!opts.fitted;
  const o = fitted
    ? { fitted, len: opts.len || 780, spx: 690, spy: 212, sx: 818, sy: 300, hx: 762, hy: 372, uax: 702, uay: 362 }
    : { fitted, len: opts.len || 796, spx: 700, spy: 214, sx: 836, sy: 318, hx: 768, hy: 400, uax: 708, uay: 378 };
  if (opts.kids) Object.assign(o, { len: 700, sx: 824, sy: 312, hx: 768, hy: 384, uay: 366 });
  const d = teeShape(o);
  const L = o.len;
  let inside = "";
  if (opts.style === "race" || opts.style === "hot") {
    const side = `M${o.uax} ${o.uay}C${o.uax + 4} ${o.uay + 130} ${o.uax + 10} ${L - 150} ${o.uax + 12} ${L}L${o.uax - 44} ${L + 8}C${o.uax - 46} ${L - 150} ${o.uax - 40} ${o.uay + 130} ${o.uax - 22} ${o.uay + 2}Z`;
    inside += both(panel(c, side, c.stripe ? c.base : mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "mesh" }));
  }
  const folds =
    hiFold(`M392 430C420 520 414 620 386 ${L - 60}`) +
    hiFold(`M612 390C592 470 598 560 626 ${L - 130}`, 22, 0.08) +
    loFold(`M${o.uax - 12} 420C${o.uax - 20} 520 ${o.uax - 16} 620 ${o.uax - 6} ${L - 70}`, 22, 0.1) +
    loFold(`M520 ${L - 90}C560 ${L - 60} 600 ${L - 40} 640 ${L - 30}`, 18, 0.08) +
    hiFold(`M${o.spx + 30} 250C${o.spx + 60} 290 ${o.sx - 40} 330 ${o.sx - 30} ${o.sy + 30}`, 16, 0.08);
  // Sleeve hem stitch (offset towards the shoulder)
  const dx = o.hx - o.sx;
  const dy = o.hy - o.sy;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 20;
  const ny = (dx / len) * 20;
  let over = "";
  over += both(stitch(c, `M${o.sx + nx * 0.9} ${o.sy + ny * 0.9 + 4}L${o.hx + nx} ${o.hy + ny}`));
  over += both(seam(c, `M${o.spx} ${o.spy}C${o.spx - 6} ${o.spy + 50} ${o.uax - 10} ${o.uay - 70} ${o.uax} ${o.uay}`));
  over += both(stitch(c, `M${M(o.uax + 10)} ${L - 20}C360 ${L - 8} 430 ${L - 4} 500 ${L - 4}`));
  over += crewNeck(c);
  if (opts.style === "race") {
    over += both(reflective(`M${o.uax - 58} ${L - 60}L${o.uax - 58} ${L - 20}`, 7));
  }
  over += markText(c, 590, 336, { size: 12 });
  return { svg: piece(c, d, { inside, folds, over }), fit: opts.kids ? 0.86 : 1 };
}

function longSleeveShape(o) {
  const L = o.len;
  const top = o.collarTop
    ? [["C", 530, o.collarTop, 552, o.collarTop - 2, 562, o.collarTop - 4], ["L", 568, 178]]
    : [["C", 530, 196, 555, 190, 568, 178]];
  const segs = [
    ...top,
    ["L", 700, 214],
    ["C", 770, 236, 836, 440, o.cx, o.cy],
    ["L", o.cix, o.ciy],
    ["C", o.cix - 16, o.ciy - 150, 748, 470, 708, 380],
  ];
  if (o.fitted) {
    segs.push(["C", 704, 470, 690, 560, 700, 650]);
    segs.push(["C", 708, 720, 716, L - 40, 718, L]);
  } else {
    segs.push(["C", 712, 520, 716, L - 150, 718, L]);
  }
  segs.push(["C", 650, L + 12, 570, L + 16, 500, L + 16]);
  return sym([500, o.collarTop || 196], segs);
}

function cuffBand(c, o, rib = true) {
  const d = `M${o.cx - 8} ${o.cy - 52}L${o.cx} ${o.cy}L${o.cix} ${o.ciy}L${o.cix - 5} ${o.ciy - 48}Z`;
  return both(panel(c, d, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.04), { pattern: rib ? "ribV" : "" }));
}

export function longSleeve(c, opts = {}) {
  const o = {
    fitted: !!opts.fitted,
    len: opts.len || 812,
    cx: opts.fitted ? 864 : 872,
    cy: 776,
    cix: opts.fitted ? 800 : 802,
    ciy: 792,
    collarTop: opts.halfZip ? 112 : 0,
  };
  const d = longSleeveShape(o);
  const L = o.len;
  let inside = "";
  if (opts.raglan) {
    inside += both(seam(c, `M548 190C590 250 650 320 708 380`, 2.4) + stitch(c, `M540 198C584 262 642 330 700 390`, 0.8));
  }
  if (opts.sidePanels) {
    const side = `M708 380C712 520 716 ${L - 150} 718 ${L}L672 ${L + 6}C668 ${L - 150} 668 520 684 392Z`;
    const sleeveGusset = `M708 380C748 470 786 640 802 792L772 790C756 650 724 500 690 392Z`;
    inside += both(panel(c, side, c.accent || mix(c.base, "#000000", 0.12), { pattern: "grid" }));
    inside += both(panel(c, sleeveGusset, c.accent || mix(c.base, "#000000", 0.12), { pattern: "grid" }));
  }
  if (opts.texture) inside += `<rect width="1000" height="1000" fill="url(#${opts.texture})"/>`;
  const folds =
    hiFold(`M392 430C420 520 414 640 386 ${L - 60}`) +
    hiFold(`M612 390C592 480 598 580 626 ${L - 120}`, 22, 0.08) +
    loFold(`M696 430C688 520 692 640 704 ${L - 70}`, 22, 0.1) +
    hiFold(`M760 300C790 400 812 520 830 650`, 18, 0.1) +
    loFold(`M742 420C768 520 784 620 792 720`, 16, 0.1) +
    loFold(`M520 ${L - 90}C560 ${L - 60} 600 ${L - 40} 640 ${L - 30}`, 18, 0.08);
  let over = "";
  if (!opts.raglan) over += both(seam(c, `M700 214C692 270 696 330 708 380`));
  over += both(stitch(c, `M282 ${L - 20}C360 ${L - 8} 430 ${L - 4} 500 ${L - 4}`));
  over += cuffBand(c, o, true);
  if (opts.thumbhole) over += both(P(`M${o.cix + 20} ${o.ciy - 30}q14 -6 26 -2`, `fill="none" stroke="${c.deep}" stroke-width="6" stroke-linecap="round"`));
  if (opts.halfZip) {
    const top = o.collarTop;
    over += both(seam(c, `M500 ${top + 60}C530 ${top + 64} 552 ${top + 66} 568 178`, 2.4));
    over += both(seam(c, `M432 178C460 190 540 190 568 178`, 2.4, 0.6));
    over += both(stitch(c, `M500 ${top + 12}C530 ${top + 12} 552 ${top + 10} 560 ${top + 8}`, 0.7));
    over += zip(c, 500, top + 2, opts.zipTo || 450);
  } else {
    over += crewNeck(c, { band: opts.raglan ? 13 : 17, depth: opts.raglan ? 250 : 258 });
  }
  if (opts.reflect) over += both(reflective(`M846 690L852 720`, 7));
  over += markText(c, 590, 336, { size: 12 });
  return { svg: piece(c, d, { inside, folds, over }) };
}

// Singlet / race vest.
export function vest(c, opts = {}) {
  const L = opts.len || 812;
  const si = opts.strapIn || 558;
  const so = opts.strapOut || 628;
  const segs = [
    ["C", 526, 234, si - 8, 220, si, 190],
    ["L", so, 194],
    ["C", so + 14, 280, 684, 386, 724, 420],
  ];
  if (opts.crop) {
    segs.push(["C", 718, 480, 700, 540, 698, L]);
  } else if (opts.fitted) {
    segs.push(["C", 718, 520, 700, 600, 708, 680]);
    segs.push(["C", 714, 730, 722, L - 30, 724, L]);
  } else {
    segs.push(["C", 728, 560, 726, 690, 724, L]);
  }
  segs.push(["C", 640, L + 10, 570, L + 14, 500, L + 14]);
  const d = sym([500, 236], segs);
  const scoop = opts.scoop || 330;
  const l = M(si);
  const front = `M${l} 190C${l + 6} ${scoop - 40} 474 ${scoop} 500 ${scoop + 2}C526 ${scoop} ${si - 6} ${scoop - 40} ${si} 190`;
  let inside = "";
  if (opts.perf) inside += `<rect width="1000" height="1000" fill="url(#perf)"/>`;
  if (opts.sidePanel) {
    const side = `M724 420C728 560 726 690 724 ${L}L664 ${L + 8}C668 680 674 540 694 412Z`;
    inside += both(panel(c, side, opts.sidePanel, { pattern: "mesh" }));
  }
  const folds =
    hiFold(`M400 440C424 540 418 640 392 ${L - 60}`) +
    hiFold(`M612 420C594 500 598 600 626 ${L - 120}`, 22, 0.08) +
    loFold(`M700 460C690 560 694 660 706 ${L - 60}`, 22, 0.1);
  let over = "";
  const inner = `${front}C${si - 10} 210 530 236 500 236C470 236 ${l + 10} 210 ${l} 190Z`;
  over += P(inner, `fill="${c.deep}"`);
  const bind = opts.binding || mix(c.base, c.dark ? "#ffffff" : "#000000", c.dark ? 0.06 : 0.1);
  const arm = `M${so} 194C${so + 14} 280 684 386 724 420`;
  over += both(P(arm, `fill="none" stroke="${c.outline}" stroke-width="14" stroke-linecap="round"`) + P(arm, `fill="none" stroke="${bind}" stroke-width="11" stroke-linecap="round"`) + stitch(c, `M${so - 14} 200C${so - 2} 286 672 392 712 428`, 0.8));
  over += P(front, `fill="none" stroke="${c.outline}" stroke-width="14" stroke-linecap="round"`);
  over += P(front, `fill="none" stroke="${bind}" stroke-width="11" stroke-linecap="round"`);
  over += stitch(c, `M${l - 12} 196C${l - 4} ${scoop - 30} 470 ${scoop + 16} 500 ${scoop + 18}C530 ${scoop + 16} ${si + 4} ${scoop - 30} ${si + 12} 196`, 0.8);
  over += P(`M${l} 190L${si} 190`, `stroke="none"`);
  if (opts.crop) {
    const band = `M${M(700)} ${L - 46}C360 ${L - 36} 430 ${L - 32} 500 ${L - 32}C570 ${L - 32} 640 ${L - 36} 700 ${L - 46}L698 ${L}C640 ${L + 10} 570 ${L + 14} 500 ${L + 14}C430 ${L + 14} 360 ${L + 10} ${M(698)} ${L}Z`;
    over += panel(c, band, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "ribH" });
  } else {
    over += both(stitch(c, `M${M(724)} ${L - 18}C360 ${L - 6} 430 ${L - 2} 500 ${L - 2}`));
  }
  if (opts.reflect) over += both(reflective(`M${so - 20} 214L${so - 12} 250`, 6));
  over += markText(c, 578, opts.crop ? 380 : 400, { size: 12 });
  return { svg: piece(c, d, { inside, folds, over }), fit: opts.crop ? 0.92 : 1 };
}

// --------------------------------------------------------------------------- //
// Outerwear
// --------------------------------------------------------------------------- //

function jacketShape(o) {
  const L = o.len;
  const segs = [];
  if (o.collarTop) {
    segs.push(["C", 532, o.collarTop, 560, o.collarTop - 2, 572, o.collarTop - 6]);
    segs.push(["L", 578, 196]);
  } else {
    segs.push(["C", 530, 205, 560, 202, 578, 196]);
  }
  if (o.sleeveless) {
    segs.push(["L", 668, 220]);
    segs.push(["C", 672, 300, 690, 372, 724, 410]);
  } else {
    segs.push(["L", 712, 232]);
    segs.push(["C", 784, 254, 848, 452, 880, 784]);
    segs.push(["L", 806, 800]);
    segs.push(["C", 790, 650, 756, 482, 722, 398]);
  }
  segs.push(["C", 726, 540, 730, L - 150, 732, L]);
  segs.push(["C", 650, L + 10, 570, L + 12, 500, L + 12]);
  return sym([500, o.collarTop || 205], segs);
}

function jacketCuffs(c, { velcro = false, elastic = false } = {}) {
  const d = `M872 732L880 784L806 800L800 748Z`;
  let s = both(panel(c, d, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: elastic ? "ribV" : "" }));
  if (velcro) s += both(`<rect x="826" y="752" width="36" height="22" rx="6" fill="${c.shade}" stroke="${c.seam}" stroke-width="2" transform="rotate(-12 844 763)"/>`);
  return s;
}

export function jacket(c, opts = {}) {
  const kind = opts.kind || "shell"; // shell | wind | gilet | insulated
  const L = opts.len || 846;
  const o = { len: L, collarTop: kind === "shell" ? 0 : 134, sleeveless: kind === "gilet" };
  const d = jacketShape(o);
  let under = "";
  let inside = "";
  let over = "";
  if (kind === "shell") {
    const hood = `M420 214C392 140 430 60 500 56C570 60 608 140 580 214Z`;
    under += piece(c, hood, {
      over:
        P(`M452 208C444 150 468 106 500 104C532 106 556 150 548 208C530 216 470 216 452 208Z`, `fill="${c.deep}"`) +
        P(`M456 204C452 156 472 118 500 116`, `fill="none" stroke="#000" stroke-width="8" opacity="0.25" filter="url(#softer)"`) +
        seam(c, `M500 56L500 104`) +
        stitch(c, `M444 206C434 146 462 94 500 92C538 94 566 146 556 206`, 0.8),
      rim: true,
    });
  }
  if (kind === "insulated") {
    inside += `<rect width="1000" height="1000" fill="url(#quilt)"/>`;
    for (let y = 152; y < L; y += 68) inside += stitch(c, `M100 ${y}L900 ${y}`, 0.55);
    const side = `M722 398C726 540 730 ${L - 150} 732 ${L}L684 ${L + 6}C684 ${L - 150} 684 540 694 404Z`;
    inside += both(panel(c, side, mix(c.base, "#000000", c.dark ? 0.25 : 0.2), { pattern: "ribV" }));
  }
  if (kind === "wind" && c.accent) {
    inside += both(panel(c, `M722 398C726 540 730 ${L - 150} 732 ${L}L690 ${L + 6}C690 ${L - 150} 690 540 700 404Z`, c.accent));
  }
  const folds =
    hiFold(`M392 440C420 540 414 660 386 ${L - 60}`, 28, 0.1) +
    hiFold(`M618 400C598 500 604 600 630 ${L - 120}`, 22, 0.08) +
    loFold(`M708 440C700 540 704 660 716 ${L - 70}`, 22, 0.12) +
    (o.sleeveless ? "" : hiFold(`M770 310C800 410 822 530 842 660`, 18, 0.1) + loFold(`M752 430C778 530 794 630 802 730`, 16, 0.12));
  if (!o.sleeveless) {
    over += both(seam(c, `M712 232C704 290 708 350 722 398`));
    over += jacketCuffs(c, { velcro: kind === "shell", elastic: kind !== "shell" });
  } else {
    const arm = `M668 220C672 300 690 372 724 410`;
    over += both(P(arm, `fill="none" stroke="${c.outline}" stroke-width="14" stroke-linecap="round"`) + P(arm, `fill="none" stroke="${c.shade}" stroke-width="11" stroke-linecap="round"`) + stitch(c, `M656 226C660 306 678 378 712 418`, 0.8));
  }
  // yoke
  if (kind === "shell" || kind === "wind") {
    over += both(seam(c, `M${o.sleeveless ? 700 : 716} 312C650 326 590 330 512 330`));
    if (kind === "wind") over += both(reflective(`M714 318C650 332 590 336 516 336`, 5));
  }
  // collar
  if (o.collarTop) {
    const t = o.collarTop;
    over += both(seam(c, `M500 ${t + 64}C532 ${t + 66} 560 ${t + 66} 578 196`, 2.4));
    over += both(stitch(c, `M510 ${t + 12}C540 ${t + 12} 560 ${t + 10} 566 ${t + 8}`, 0.7));
  } else {
    // hood drawcords
    over += drawcord({ ...c, accent: c.accent || c.trim }, 458, 542, 214, 70);
  }
  // hem
  over += both(stitch(c, `M${M(732)} ${L - 22}C360 ${L - 10} 430 ${L - 8} 500 ${L - 8}`));
  if (kind === "shell" || kind === "wind") {
    over += both(`<rect x="686" y="${L - 34}" width="16" height="28" rx="6" fill="#2b2d31" stroke="#15161a" stroke-width="1.5"/>`);
  }
  // zip + storm flap
  over += P(`M514 ${o.collarTop || 205}L514 ${L + 12}`, `stroke="${c.shade}" stroke-width="10" opacity="0.6"`);
  over += zip(c, 500, o.collarTop ? o.collarTop + 2 : 206, L + 10);
  // pockets
  if (kind === "shell") over += zipLine(c, 580, 346, 660, 318);
  if (kind === "gilet" || kind === "insulated") over += both(zipLine(c, 608, 610, 650, 720));
  if (kind === "wind") over += zipLine(c, 590, 390, 590, 470);
  over += markText(c, kind === "shell" ? 616 : 616, kind === "shell" ? 392 : 400, { size: 12, rotate: kind === "shell" ? -19 : 0 });
  return { svg: piece(c, d, { under, inside, folds, over }) };
}

// --------------------------------------------------------------------------- //
// Bottoms
// --------------------------------------------------------------------------- //

function waistband(c, x1, top, bottom, { cord = true, pockets = false } = {}) {
  const x2 = M(x1);
  let s = panel(c, `M${x1} ${top}L${x2} ${top}L${x2 + 4} ${bottom}L${x1 - 4} ${bottom}Z`, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "ribH" });
  s += stitch(c, `M${x1 + 4} ${top + 8}L${x2 - 4} ${top + 8}`, 0.7);
  if (cord) s += drawcord(c, 486, 514, top + (bottom - top) * 0.55, 96);
  return s;
}

export function shorts(c, opts = {}) {
  const L = opts.len || 640;
  const crotch = Math.min(560, L - 80);
  const hipOut = opts.fitted ? 712 : 706;
  const hemOut = opts.fitted ? 766 : 756;
  const segs = [
    ["L", 702, 248],
    ["C", 705, 265, 706, 285, hipOut, 300],
  ];
  let under = "";
  if (opts.split) {
    const st = L - 76;
    segs.push(["C", hipOut + 12, 400, hemOut - 18, 500, hemOut - 8, st]);
    segs.push(["C", hemOut - 26, L - 8, 640, L + 8, 540, L + 6]);
    const wedge = `M${hemOut - 10} ${st - 20}L${hemOut + 4} ${L - 8}C${hemOut - 12} ${L - 2} ${hemOut - 30} ${L} ${hemOut - 48} ${L - 2}Z`;
    under = both(piece({ ...c, fill: c.shade }, wedge, { fill: c.shade, rim: false }));
  } else {
    segs.push(["C", hipOut + 12, 400, hemOut - 14, 520, hemOut, L - 14]);
    segs.push(["C", 700, L + 4, 600, L + 10, 540, L + 6]);
  }
  segs.push(["C", 526, L - 30, 512, crotch + 30, 500, crotch]);
  const d = sym([500, 248], segs);
  let inside = "";
  if (opts.trail) {
    const side = `M${hipOut} 300C${hipOut + 12} 400 ${hemOut - 14} 520 ${hemOut} ${L - 14}L${hemOut - 56} ${L - 4}C${hemOut - 70} 520 ${hipOut - 40} 400 ${hipOut - 46} 300Z`;
    inside += both(panel(c, side, c.accent || c.shade));
  }
  if (opts.marathon) {
    inside += both(panel(c, `M600 300L${hipOut} 300L${hipOut + 6} 368L604 374Z`, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "mesh" }));
  }
  if (opts.speed) inside += `<rect y="300" width="1000" height="${L}" fill="url(#perf)" opacity="0.8"/>`;
  const folds =
    hiFold(`M380 330C400 420 404 500 392 ${L - 40}`, 26, 0.1) +
    loFold(`M520 ${crotch + 10}C560 ${crotch + 30} 600 ${L - 30} 640 ${L - 16}`, 18, 0.12) +
    hiFold(`M620 330C640 420 660 500 680 ${L - 60}`, 18, 0.07) +
    loFold(`M${hipOut - 10} 320C${hipOut} 420 ${hemOut - 30} 520 ${hemOut - 20} ${L - 40}`, 20, 0.1);
  let over = "";
  over += waistband(c, 298, 248, 300);
  over += seam(c, `M500 300L500 ${crotch}`);
  if (opts.split) {
    over += both(stitch(c, `M540 ${L - 12}C640 ${L - 12} ${hemOut - 34} ${L - 20} ${hemOut - 22} ${L - 78}`));
  } else {
    over += both(stitch(c, `M542 ${L - 12}C600 ${L - 6} 700 ${L - 12} ${hemOut - 4} ${L - 32}`));
  }
  if (opts.trail) {
    over += zipLine(c, 640, 400, 646, 520);
    over += both(reflective(`M${hemOut - 40} ${L - 50}L${hemOut - 32} ${L - 24}`, 6));
  }
  over += markText(c, 380, L - 60, { size: 11, rotate: 0 });
  return { svg: piece(c, d, { under, inside, folds, over }) };
}

export function tights(c, opts = {}) {
  const full = !!opts.full;
  const segs = [
    ["L", 694, 246],
    ["C", 698, 270, 700, 300, 700, 318],
  ];
  let L;
  if (full) {
    L = 944;
    segs.push(["C", 722, 430, 714, 600, 672, 760]);
    segs.push(["C", 654, 830, 644, 880, 640, L - 4]);
    segs.push(["L", 568, L]);
    segs.push(["C", 562, 860, 560, 760, 552, 660]);
    segs.push(["C", 544, 610, 524, 576, 500, 560]);
  } else {
    L = 716;
    segs.push(["C", 718, 420, 718, 560, 696, L - 6]);
    segs.push(["L", 558, L]);
    segs.push(["C", 550, 640, 528, 582, 500, 560]);
  }
  const d = sym([500, 246], segs);
  let inside = "";
  // side phone pocket
  const pocket = full ? `M662 350L714 354L716 470L664 474Z` : `M660 360L714 364L716 480L662 484Z`;
  inside += both(panel(c, pocket, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05)));
  if (opts.texture) inside += `<rect width="1000" height="1000" fill="url(#${opts.texture})"/>`;
  const folds =
    hiFold(`M400 340C380 440 390 540 410 ${full ? 740 : 680}`, 26, 0.12) +
    hiFold(`M612 340C630 440 632 540 620 ${full ? 740 : 680}`, 22, 0.08) +
    (full ? loFold(`M600 770C590 830 596 880 604 920`, 18, 0.12) + hiFold(`M620 800C616 850 614 890 612 930`, 12, 0.1) : "") +
    loFold(`M680 330C700 440 702 560 682 ${full ? 740 : 690}`, 18, 0.1);
  let over = "";
  over += waistband(c, 306, 246, 318, { cord: true });
  over += seam(c, `M500 318L500 560`);
  over += both(seam(c, `M600 318C588 420 596 ${full ? 600 : 560} 616 ${full ? 760 : L}`, 2.2, 0.7));
  if (full) {
    over += both(seam(c, `M556 700C590 720 630 720 668 706`, 2, 0.5));
    over += both(reflective(`M634 ${L - 90}L636 ${L - 40}`, 6));
    over += both(stitch(c, `M572 ${L - 16}L636 ${L - 20}`));
  } else {
    over += both(stitch(c, `M562 ${L - 16}L694 ${L - 22}`));
    over += both(reflective(`M${680} ${L - 60}L${684} ${L - 34}`, 6));
  }
  over += markText(c, 372, full ? 470 : 470, { size: 11 });
  return { svg: piece(c, d, { inside, folds, over }) };
}

export function trousers(c, opts = {}) {
  const joggers = !!opts.joggers;
  const L = 944;
  const segs = [
    ["L", 702, 248],
    ["C", 705, 268, 706, 290, 708, 306],
    ["C", 730, 460, 732, 700, joggers ? 700 : 694, joggers ? 884 : L - 4],
  ];
  if (joggers) {
    segs.push(["L", 698, L]);
    segs.push(["L", 588, L + 4]);
    segs.push(["L", 590, 888]);
  } else {
    segs.push(["L", 590, L]);
  }
  segs.push(["C", 572, 760, 550, 640, 500, 590]);
  const d = sym([500, 248], segs);
  const folds =
    hiFold(`M392 340C372 480 380 640 400 860`, 28, 0.12) +
    hiFold(`M618 360C640 500 640 660 626 860`, 22, 0.08) +
    loFold(`M560 640C590 700 620 740 660 760`, 16, 0.1) +
    loFold(`M600 800C630 820 660 830 690 830`, 14, 0.1) +
    loFold(`M690 330C712 480 716 640 690 860`, 18, 0.1);
  let over = "";
  over += waistband(c, 298, 248, 306);
  over += seam(c, `M500 306L500 590`);
  over += both(seam(c, `M632 312C652 360 680 396 714 414`, 2.6));
  over += both(stitch(c, `M624 316C644 366 672 404 710 426`, 0.7));
  if (joggers) {
    over += both(panel(c, `M700 884L698 ${L}L588 ${L + 4}L590 888Z`, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "ribV" }));
  } else {
    over += both(zipLine(c, 688, L - 8, 680, L - 110));
    over += both(stitch(c, `M594 ${L - 14}L690 ${L - 18}`));
    over += both(reflective(`M670 ${L - 150}L666 ${L - 128}`, 6));
  }
  over += markText(c, 372, 470, { size: 11 });
  return { svg: piece(c, d, { folds, over }) };
}

// --------------------------------------------------------------------------- //
// Accessories
// --------------------------------------------------------------------------- //

function sockPath(top) {
  const instep = Math.max(486, top + 24);
  return `M380 ${top}L540 ${top}L543 ${instep}C546 556 600 586 700 590C792 594 820 624 818 662C816 702 780 714 720 714L474 714C404 714 372 664 378 600C381 ${600 - (600 - top) * 0.4} 380 ${top + (600 - top) * 0.2} 380 ${top}Z`;
}

function sock(c, opts) {
  const top = opts.top;
  const d = sockPath(top);
  const acc = c.accent || opts.accent || c.shade;
  let inside = "";
  inside += panel(c, `M378 598C372 664 404 714 474 714L488 714C476 668 446 632 384 592Z`, acc, { stroke: false });
  inside += panel(c, `M738 590C792 596 820 624 818 662C816 702 780 714 736 714C756 680 756 624 738 590Z`, acc, { stroke: false });
  inside += seam(c, `M384 592C446 632 476 668 488 714`, 2.2);
  inside += seam(c, `M738 590C756 624 756 680 736 714`, 2.2);
  if (opts.texture) inside += `<rect width="1000" height="1000" fill="url(#${opts.texture})" opacity="0.6"/>`;
  // arch compression band
  inside += `<rect x="604" y="560" width="52" height="170" fill="url(#ribV)"/>` + seam(c, `M604 584L604 714`, 1.6, 0.5) + seam(c, `M656 590L656 714`, 1.6, 0.5);
  // cuff rib
  const cuffH = opts.ankle ? 26 : 56;
  inside += `<rect x="370" y="${top}" width="180" height="${cuffH}" fill="url(#ribV)"/>`;
  inside += seam(c, `M380 ${top + cuffH}L542 ${top + cuffH}`, 2);
  if (opts.stripes) {
    inside += `<rect x="370" y="${top + 70}" width="180" height="12" fill="${acc}"/><rect x="370" y="${top + 92}" width="180" height="12" fill="${acc}"/>`;
  }
  const folds = hiFold(`M420 ${top + 60}L420 560`, 22, 0.12) + loFold(`M530 ${top + 40}L534 520`, 18, 0.12) + hiFold(`M600 632C660 640 720 640 790 634`, 16, 0.06);
  const over = opts.mark && !opts.ankle ? markText(c, 460, Math.max(top + 140, 460), { size: 10, rotate: -90 }) : opts.mark ? markText(c, 640, 690, { size: 9 }) : "";
  // Ankle socks: raised heel tab behind the cuff.
  const under = opts.ankle
    ? piece(c, `M380 ${top + 6}C376 ${top - 34} 392 ${top - 50} 414 ${top - 46}C436 ${top - 42} 444 ${top - 20} 446 ${top + 6}Z`, { fill: acc, rim: false })
    : "";
  return piece(c, d, { under, inside, folds, over });
}

export function socks(c, opts = {}) {
  const top = opts.ankle ? 490 : opts.mid ? 300 : 180;
  const back = sock(c, { ...opts, top, mark: false });
  const front = sock(c, { ...opts, top, mark: true });
  const svg = `<g transform="translate(-120 -70) rotate(-4 500 500)">${back}</g><g transform="translate(40 40)">${front}</g>`;
  return { svg, fit: opts.ankle ? 0.84 : 0.92 };
}

export function cap(c) {
  // Side profile, brim to the left.
  const crown = `M330 604C314 470 382 318 524 300C668 300 742 424 734 604C620 618 440 618 330 604Z`;
  const side = `M520 302C470 362 440 470 436 612L640 612C634 470 594 362 520 302Z`;
  const sideCol = c.accent || c.shade;
  const crownInside =
    P(side, `fill="${sideCol}"`) +
    P(side, `fill="url(#perf)"`) +
    P(`M690 560L740 560L740 620L690 620Z`, `fill="${c.deep}"`) +
    hiFold(`M400 420C430 360 480 330 540 322`, 30, 0.14) +
    loFold(`M700 420C716 480 722 540 720 600`, 26, 0.14);
  const crownOver =
    seam(c, `M520 302C470 362 440 470 436 612`, 2.6) +
    seam(c, `M520 302C594 362 634 470 640 612`, 2.6) +
    stitch(c, `M508 312C462 372 430 474 424 606`, 0.7) +
    stitch(c, `M532 312C600 372 646 474 652 606`, 0.7) +
    stitch(c, `M338 584C440 596 620 596 728 584`, 0.6) +
    `<ellipse cx="522" cy="301" rx="15" ry="8" fill="${c.base}" stroke="${c.outline}" stroke-width="2.2"/>` +
    // rear adjuster strap + buckle
    `<rect x="676" y="574" width="62" height="16" rx="4" fill="${c.deep}" stroke="${c.outline}" stroke-width="1.5"/>` +
    `<rect x="700" y="570" width="18" height="24" rx="3" fill="#2b2d31" stroke="#15161a" stroke-width="1.5"/>` +
    markText(c, 380, 520, { size: 11, rotate: -62, fill: c.accent || c.mark });
  let s = piece(c, crown, { inside: crownInside, over: crownOver });
  const brim = `M476 604C390 586 256 590 140 628C100 642 102 680 142 686C262 698 380 670 480 630Z`;
  const brimInside =
    P(`M104 664C160 684 280 680 380 650C420 638 452 628 480 616L484 640C390 684 262 706 142 694C116 690 104 680 104 664Z`, `fill="${c.deep}" opacity="0.6"`) +
    hiFold(`M160 640C250 610 350 600 440 604`, 16, 0.16);
  const brimOver =
    stitch(c, `M150 642C250 612 350 602 450 608`, 0.8) +
    stitch(c, `M140 660C250 632 360 618 462 618`, 0.6) +
    P(`M330 600C380 596 430 598 476 604`, `fill="none" stroke="#000" stroke-width="10" opacity="0.2" filter="url(#softer)"`);
  s += piece(c, brim, { inside: brimInside, over: brimOver, rim: false });
  return { svg: s, fit: 0.84 };
}

export function beanie(c) {
  const dome = `M298 600C286 420 376 250 500 244C624 250 714 420 702 600Z`;
  const cuff = `M286 560C420 548 580 548 714 560L718 700C580 712 420 712 282 700Z`;
  let s = piece(c, dome, {
    inside:
      `<rect width="1000" height="1000" fill="url(#ribV)" opacity="0.7"/>` +
      both(seam(c, `M500 250C470 320 456 420 452 560`, 2, 0.5)),
    folds: hiFold(`M400 330C440 290 500 280 560 290`, 34, 0.14) + loFold(`M650 360C680 440 690 500 690 560`, 24, 0.14),
  });
  s += piece(c, cuff, {
    inside: `<rect width="1000" height="1000" fill="url(#ribV)"/>` + P(`M286 560C420 548 580 548 714 560`, `fill="none" stroke="#000" stroke-width="16" opacity="0.18" filter="url(#softer)"`),
    folds: hiFold(`M300 600C420 590 580 590 700 600`, 18, 0.12),
    over: `<rect x="468" y="606" width="64" height="44" rx="4" fill="${c.deep}" opacity="0.9"/>` + `<text x="500" y="633" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="700" font-size="8" letter-spacing="1.6" fill="${c.dark ? "#e9e4d8" : "#f4efe4"}">HARBOUR</text>`,
  });
  return { svg: s, fit: 0.8 };
}

export function headband(c) {
  // Short cylinder seen from above at an angle.
  const outer = `M190 450A310 120 0 0 1 810 450L810 540A310 120 0 0 1 190 540Z`;
  const hole = `M204 452A296 108 0 0 1 796 452A296 108 0 0 1 204 452Z`;
  const holeId = nextId("hole");
  let s = piece(c, outer, {
    rim: true,
    inside: `<rect width="1000" height="1000" fill="url(#vfade)" opacity="0.6"/>`,
    folds: hiFold(`M260 560C360 610 460 624 560 620`, 30, 0.14) + loFold(`M700 560C740 548 770 530 790 510`, 24, 0.14),
    over:
      `<defs><clipPath id="${holeId}"><path d="${hole}"/></clipPath></defs>` +
      `<g clip-path="url(#${holeId})">` +
      P(hole, `fill="${c.shade}"`) +
      P(`M160 540A340 120 0 0 1 840 540L840 700L160 700Z`, `fill="#F7F4EC"`) +
      P(`M170 542A330 110 0 0 1 830 542`, `fill="none" stroke="#3a2d1c" stroke-width="26" opacity="0.18" filter="url(#soft)"`) +
      P(`M204 452A296 108 0 0 1 796 452`, `fill="none" stroke="#000" stroke-width="18" opacity="0.2" filter="url(#softer)"`) +
      `</g>` +
      P(hole, `fill="none" stroke="${c.outline}" stroke-width="2.4"`) +
      P(`M200 470A300 112 0 0 0 800 470`, `fill="none" stroke="${c.seam}" stroke-width="2" opacity="0.6"`) +
      stitch(c, `M198 528A302 114 0 0 0 802 528`, 0.7) +
      reflective(`M430 574A300 112 0 0 0 570 574`, 5) +
      markText(c, 500, 604, { size: 12 }),
  });
  return { svg: s, fit: 0.86 };
}

export function neckWarmer(c) {
  // Flattened tube, top edge folded over.
  const d = `M322 236C420 226 580 226 678 236C692 420 690 600 684 792C600 804 400 804 316 792C310 600 308 420 322 236Z`;
  const fold = `M322 236C420 226 580 226 678 236L682 332C590 324 410 324 318 332Z`;
  const s = piece(c, d, {
    inside:
      `<rect width="1000" height="1000" fill="url(#ribV)" opacity="0.35"/>` +
      panel(c, fold, mix(c.base, c.dark ? "#ffffff" : "#000000", 0.05), { pattern: "ribV" }) +
      P(`M318 332C410 324 590 324 682 332`, `fill="none" stroke="#000" stroke-width="16" opacity="0.2" filter="url(#softer)"`),
    folds:
      hiFold(`M340 360C346 500 344 640 336 780`, 22, 0.16) +
      loFold(`M662 360C668 500 668 640 662 780`, 22, 0.18) +
      hiFold(`M430 360C450 480 440 620 420 770`, 30, 0.1) +
      loFold(`M520 370C540 500 560 640 600 780`, 20, 0.12) +
      hiFold(`M590 360C600 460 600 560 620 700`, 18, 0.08),
    over:
      stitch(c, `M324 250C420 240 580 240 676 250`, 0.6) +
      stitch(c, `M318 774C400 786 600 786 682 774`, 0.7) +
      markText(c, 500, 700, { size: 12 }),
  });
  return { svg: `<g transform="rotate(-4 500 500)">${s}</g>`, fit: 0.82 };
}

function glovePath() {
  return (
    "M404 700C406 650 420 600 430 540" +
    "L432 426C432 398 470 398 470 426L474 520" +
    "L476 386C476 356 520 356 520 386L523 516" +
    "L526 372C526 340 571 340 571 372L576 516" +
    "L578 396C578 368 622 368 622 396L620 590" +
    "C646 570 668 530 688 518C712 512 726 538 712 570C690 620 640 670 596 700" +
    "L600 866L400 866Z"
  );
}

function glove(c) {
  const d = glovePath();
  const tip = c.accent || c.deep;
  const inside =
    P(`M578 396C578 368 622 368 622 396L622 420L578 420Z`, `fill="${tip}" opacity="0.9"`) +
    P(`M688 518C712 512 726 538 712 570L690 560C696 540 694 526 688 518Z`, `fill="${tip}" opacity="0.9"`) +
    `<rect x="380" y="770" width="240" height="100" fill="url(#ribV)"/>`;
  const folds = hiFold(`M450 560C470 620 480 660 470 700`, 26, 0.12) + loFold(`M590 600C600 640 600 680 594 700`, 18, 0.12);
  const over =
    seam(c, `M474 520L476 600`, 2.2) +
    seam(c, `M523 516L524 600`, 2.2) +
    seam(c, `M576 516L578 600`, 2.2) +
    seam(c, `M402 770L598 770`, 2.4) +
    stitch(c, `M404 784L598 784`, 0.7) +
    reflective(`M470 640L560 640`, 7) +
    markText(c, 500, 740, { size: 10 });
  return piece(c, d, { inside, folds, over });
}

export function gloves(c) {
  const svg = `<g transform="translate(860 -40) scale(-1 1) rotate(-6 500 600)">${glove(c)}</g><g transform="translate(60 20) rotate(6 500 600)">${glove(c)}</g>`;
  return { svg, fit: 0.88 };
}

function sleeveTube(c) {
  const d = `M418 170C470 160 530 160 582 170L566 800C536 810 470 810 440 800Z`;
  const grip = c.accent || c.shade;
  const inside =
    P(`M410 170L590 170L588 222L412 222Z`, `fill="${grip}"`) +
    `<rect x="400" y="170" width="200" height="52" fill="url(#ribH)"/>` +
    hiFold(`M460 240L470 780`, 26, 0.14) +
    loFold(`M560 240L548 780`, 20, 0.14);
  const over = seam(c, `M414 222C470 214 530 214 586 222`, 2.4) + stitch(c, `M444 786C480 794 520 794 560 786`, 0.7) + reflective(`M500 700L500 740`, 6) + markText(c, 500, 480, { size: 10, rotate: -90 });
  return piece(c, d, { inside, over });
}

export function armSleeves(c) {
  const svg = `<g transform="translate(-110 10) rotate(-10 500 500)">${sleeveTube(c)}</g><g transform="translate(90 20) rotate(8 500 500)">${sleeveTube(c)}</g>`;
  return { svg, fit: 0.92 };
}

export function flask(c, opts = {}) {
  const body = `M396 404C386 334 444 304 470 294L470 256L530 256L530 294C556 304 614 334 604 404L610 788C610 836 578 856 500 858C422 856 390 836 390 788Z`;
  const tint = c.base;
  const liquid = mix(tint, "#0b1a2a", 0.25);
  let s = "";
  const id = nextId("fl");
  s += `<defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>`;
  s += P(body, `class="sil" fill="${mix(tint, "#ffffff", 0.45)}" opacity="0.92" filter="url(#shadow)"`);
  s += `<g clip-path="url(#${id})">`;
  s += `<rect x="380" y="470" width="240" height="400" fill="${liquid}" opacity="0.78"/>`;
  s += P(`M380 470C440 462 560 478 620 470`, `fill="none" stroke="#ffffff" stroke-width="4" opacity="0.5"`);
  s += `<rect width="1000" height="1000" fill="url(#sheen)"/>`;
  s += hiFold(`M430 360L424 820`, 26, 0.35) + hiFold(`M570 420L574 800`, 12, 0.2);
  s += loFold(`M470 560C520 590 560 600 600 590`, 12, 0.18) + loFold(`M400 690C450 700 500 720 540 750`, 12, 0.16);
  s += `</g>`;
  s += P(body, `fill="none" stroke="${mix(tint, "#000000", 0.35)}" stroke-width="2.4" opacity="0.9"`);
  // graduation ticks
  for (let i = 0; i < 5; i++) {
    const y = 540 + i * 56;
    s += P(`M592 ${y}L${i % 2 ? 578 : 570} ${y}`, `stroke="#ffffff" stroke-width="3" opacity="0.7"`);
  }
  // cap + bite valve
  const capC = opts.capColour || mix(tint, "#000000", 0.5);
  s += `<rect x="452" y="190" width="96" height="72" rx="10" fill="${capC}" filter="url(#shadow)"/>`;
  for (let x = 462; x < 544; x += 10) s += P(`M${x} 196L${x} 256`, `stroke="#000" stroke-width="3" opacity="0.25"`);
  s += `<rect x="452" y="190" width="96" height="72" rx="10" fill="none" stroke="#000" stroke-width="2" opacity="0.4"/>`;
  s += P(`M480 190L482 132C482 120 518 120 518 132L520 190Z`, `class="sil" fill="${opts.valve || "#2a2c30"}" stroke="#000" stroke-width="2" opacity="0.92"`);
  s += P(`M488 186L490 140`, `stroke="#ffffff" stroke-width="5" opacity="0.2" stroke-linecap="round"`);
  s += `<rect x="440" y="600" width="120" height="30" rx="4" fill="#ffffff" opacity="0.18"/>`;
  s += markText(c, 500, 620, { size: 11, fill: "#f4efe4", opacity: 0.9 });
  return { svg: s, fit: 0.86 };
}

export function racePack(c) {
  const right = `M548 160C575 152 612 152 640 162C648 250 690 330 742 372L748 690C740 730 690 752 620 750C590 748 572 736 566 716L552 420C548 330 546 240 548 160Z`;
  const back = `M420 150C460 138 540 138 580 150L604 580C560 600 440 600 396 580Z`;
  const flaskTint = "#8fbad8";
  let s = "";
  s += piece({ ...c }, back, { fill: c.shade, inside: `<rect width="1000" height="1000" fill="url(#mesh)"/>`, rim: true });
  const panelSide = (mirror) => {
    let inside = "";
    // soft flask in front pocket
    inside += `<rect x="606" y="380" width="122" height="290" rx="36" fill="${flaskTint}" opacity="0.85"/>`;
    inside += `<rect x="606" y="470" width="122" height="200" rx="30" fill="${mix(flaskTint, "#0b1a2a", 0.3)}" opacity="0.8"/>`;
    const pocket = `M588 420L738 432L744 648C724 700 640 712 598 690Z`;
    inside += P(pocket, `fill="${c.base}" opacity="0.45"`) + P(pocket, `fill="url(#mesh)"`) + P(pocket, `fill="none" stroke="${c.seam}" stroke-width="3"`);
    inside += P(`M592 424L736 436`, `stroke="${c.accent || c.trim}" stroke-width="6" opacity="0.8"`);
    // bungee cord
    inside += P(`M600 560L730 520M600 520L730 560`, `stroke="${c.accent || c.trim}" stroke-width="4" opacity="0.8"`);
    const folds = hiFold(`M590 200C600 300 620 380 640 400`, 20, 0.12) + loFold(`M730 400L736 680`, 18, 0.14);
    let over = "";
    // flask top
    over += `<rect x="640" y="340" width="46" height="62" rx="8" fill="#26282c"/>`;
    over += `<rect x="652" y="306" width="22" height="40" rx="6" fill="#3b3e44"/>`;
    over += reflective(`M600 190L612 250`, 7);
    over += stitch(c, `M560 172C560 300 566 500 576 712`, 0.7);
    if (!mirror) over += markText(c, 680, 720, { size: 10, rotate: -6 });
    return piece(c, right, { inside, folds, over });
  };
  s += panelSide(false);
  s += mirrorG(panelSide(true));
  // sternum straps
  const strap = c.dark ? "#3a3d42" : mix(c.base, "#000000", 0.45);
  for (const y of [430, 500]) {
    s += `<rect x="444" y="${y}" width="112" height="14" rx="4" fill="${strap}" filter="url(#shadow)"/>`;
    s += `<rect x="484" y="${y - 6}" width="32" height="26" rx="5" fill="#1b1c20"/>`;
  }
  return { svg: s, fit: 0.9 };
}

// --------------------------------------------------------------------------- //
// Mapping
// --------------------------------------------------------------------------- //

export const TEMPLATE_NAMES = [
  "tee", "tee-fitted", "tee-race", "tee-hot", "kids-tee",
  "long-sleeve", "half-zip", "tempo-top", "base-layer", "thermal-top",
  "vest", "singlet", "elite-vest", "crop-vest",
  "shell-jacket", "windbreaker", "gilet", "insulated-jacket",
  "shorts-split", "shorts-5in", "shorts-7in", "shorts-marathon", "shorts-trail",
  "half-tights", "tights", "trousers", "joggers",
  "socks-crew", "socks-race", "socks-ankle", "socks-merino",
  "cap", "beanie", "headband", "neck-warmer", "gloves", "arm-sleeves", "race-pack", "soft-flask",
];

// Pick a template for a product from its handle/title/type. Returns null when
// nothing matches (the renderer warns and fails).
export function templateFor(product) {
  const h = product.handle;
  const t = `${h} ${product.title} ${product.type}`.toLowerCase();
  const fitted = h.startsWith("womens-");
  const has = (s) => t.includes(s);
  if (has("kids") || has("youth")) return { name: "kids-tee", draw: (c) => tee(c, { kids: true }) };
  if (has("flask")) return { name: "soft-flask", draw: (c) => flask(c) };
  if (has("race-pack") || has("race pack")) return { name: "race-pack", draw: (c) => racePack(c) };
  if (has("sock")) {
    if (has("ankle")) return { name: "socks-ankle", draw: (c) => socks(c, { ankle: true }) };
    if (has("race-socks")) return { name: "socks-race", draw: (c) => socks(c, { mid: true, stripes: true }) };
    if (has("merino")) return { name: "socks-merino", draw: (c) => socks(c, { texture: "ribV" }) };
    return { name: "socks-crew", draw: (c) => socks(c, {}) };
  }
  if (has("beanie")) return { name: "beanie", draw: (c) => beanie(c) };
  if (has("neck-warmer")) return { name: "neck-warmer", draw: (c) => neckWarmer(c) };
  if (has("headband")) return { name: "headband", draw: (c) => headband(c) };
  if (has("glove")) return { name: "gloves", draw: (c) => gloves(c) };
  if (has("arm-sleeve")) return { name: "arm-sleeves", draw: (c) => armSleeves(c) };
  if (has("cap")) return { name: "cap", draw: (c) => cap(c) };
  if (has("gilet")) return { name: "gilet", draw: (c) => jacket(c, { kind: "gilet" }) };
  if (has("insulated")) return { name: "insulated-jacket", draw: (c) => jacket(c, { kind: "insulated" }) };
  if (has("windbreaker")) return { name: "windbreaker", draw: (c) => jacket(c, { kind: "wind", len: fitted ? 820 : 846 }) };
  if (has("shell") || has("all-weather-jacket")) return { name: "shell-jacket", draw: (c) => jacket(c, { kind: "shell", len: fitted ? 826 : 846 }) };
  if (has("half-tights")) return { name: "half-tights", draw: (c) => tights(c, {}) };
  if (has("tights")) return { name: "tights", draw: (c) => tights(c, { full: true }) };
  if (has("joggers")) return { name: "joggers", draw: (c) => trousers(c, { joggers: true }) };
  if (has("trousers")) return { name: "trousers", draw: (c) => trousers(c, {}) };
  if (has("shorts")) {
    if (has("trail")) return { name: "shorts-trail", draw: (c) => shorts(c, { trail: true, len: fitted ? 680 : 700, fitted }) };
    if (has("marathon")) return { name: "shorts-marathon", draw: (c) => shorts(c, { marathon: true, split: true, len: fitted ? 610 : 630, fitted }) };
    if (has("split") || h === "running-shorts") return { name: "shorts-split", draw: (c) => shorts(c, { split: true, len: fitted ? 600 : 620, fitted }) };
    if (has("speed")) return { name: "shorts-5in", draw: (c) => shorts(c, { split: true, speed: true, len: 610, fitted }) };
    return { name: "shorts-7in", draw: (c) => shorts(c, { len: 690, fitted }) };
  }
  if (has("crop")) return { name: "crop-vest", draw: (c) => vest(c, { crop: true, len: 610, fitted: true, scoop: 320 }) };
  if (has("elite")) return { name: "elite-vest", draw: (c) => vest(c, { perf: true, sidePanel: c.accent || c.shade, reflect: true }) };
  if (has("singlet")) return { name: "singlet", draw: (c) => vest(c, { strapIn: 552, strapOut: 640, scoop: 300 }) };
  if (has("vest")) return { name: "vest", draw: (c) => vest(c, { perf: true, fitted, reflect: true }) };
  if (has("thermal")) return { name: "thermal-top", draw: (c) => longSleeve(c, { halfZip: true, zipTo: 400, texture: "grid", thumbhole: true }) };
  if (has("base-layer") || has("base layer")) return { name: "base-layer", draw: (c) => longSleeve(c, { raglan: true, thumbhole: true, fitted }) };
  if (has("half-zip")) return { name: "half-zip", draw: (c) => longSleeve(c, { halfZip: true, zipTo: 470 }) };
  if (has("tempo")) return { name: "tempo-top", draw: (c) => longSleeve(c, { halfZip: true, zipTo: 380, sidePanels: true, thumbhole: true, reflect: true }) };
  if (has("long-sleeve") || has("long sleeve")) return { name: "long-sleeve", draw: (c) => longSleeve(c, { fitted }) };
  if (has("hot-weather")) return { name: "tee-hot", draw: (c) => tee(c, { style: "hot", fitted }) };
  if (has("race-tee")) return { name: "tee-race", draw: (c) => tee(c, { style: "race", fitted }) };
  if (has("tee")) return { name: fitted ? "tee-fitted" : "tee", draw: (c) => tee(c, { fitted }) };
  return null;
}
