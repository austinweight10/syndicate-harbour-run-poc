#!/usr/bin/env node
/**
 * Harbour Run — render the demo catalogue's product images.
 *
 * Reads data/products.csv, picks an SVG flat-lay template per product
 * (product_image_templates.mjs), renders one PNG per product × colourway with
 * Playwright/Chromium, and writes:
 *
 *   images/<handle>/<colour-slug>.png   products with a Colour option
 *   images/<handle>/main.png            products without one (garment colour =
 *                                       the placehold.co background hex in the
 *                                       product's Image Src)
 *   images/manifest.json                handle → [{ colour, file, alt }] — read
 *                                       by seed_store.py's `images` stage
 *   images/contact-sheet.png            review grid of every image
 *
 * Run (from the repo root; Playwright + Chromium come from shopify-app/):
 *
 *   node docs/live-demo-store/scripts/render_product_images.mjs
 *
 * Options (env):
 *   ONLY=mens-race-tee,cap     render a subset of handles (manifest is still
 *                              written for the full catalogue only on full runs)
 *   SIZE=1200                  output edge in px (default 1200 → ~19 MB for
 *                              the set; 1600 works but is ~29 MB)
 *   SHEET_ONLY=1               rebuild the contact sheet from existing PNGs
 *   THUMB=340 SHEET_OUT=/tmp/x.png   bigger thumbnails / sheet elsewhere
 *                              (handy with ONLY= while iterating on a template)
 *
 * If Chromium is missing: (cd shopify-app && npx playwright install chromium)
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { PALETTE, makeColours, defs, background, slug, templateFor, BACKGROUND } from "./product_image_templates.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."); // docs/live-demo-store
const REPO = path.resolve(ROOT, "..", "..");
const OUT = path.join(ROOT, "images");
const require = createRequire(path.join(REPO, "shopify-app", "package.json"));
const { chromium } = require("playwright");

const SIZE = parseInt(process.env.SIZE || "1200", 10);
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const VERSION = "hr-img-v1";

// --------------------------------------------------------------------------- //
// CSV (RFC 4180, quoted multi-line fields)
// --------------------------------------------------------------------------- //

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function loadProducts() {
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, "data", "products.csv"), "utf8"));
  const products = new Map();
  for (const r of rows) {
    const handle = r.Handle.trim();
    let p = products.get(handle);
    if (!p) {
      p = { handle, title: r.Title, type: r.Type, colourOption: null, colours: [], placeholder: null };
      products.set(handle, p);
    }
    for (const i of [1, 2, 3]) {
      if (r[`Option${i} Name`] === "Colour") p.colourOption = `Option${i}`;
    }
    if (p.colourOption && r[`${p.colourOption} Value`] && !p.colours.includes(r[`${p.colourOption} Value`])) {
      p.colours.push(r[`${p.colourOption} Value`]);
    }
    const m = /placehold\.co\/\d+x\d+\/([0-9a-f]{6})\/([0-9a-f]{6})/i.exec(r["Image Src"] || "");
    if (m && !p.placeholder) p.placeholder = { bg: `#${m[1]}`, fg: `#${m[2]}` };
  }
  return [...products.values()];
}

// --------------------------------------------------------------------------- //
// Jobs
// --------------------------------------------------------------------------- //

function buildJobs(products) {
  const jobs = [];
  const problems = [];
  for (const p of products) {
    const tpl = templateFor(p);
    if (!tpl) {
      problems.push(`no template for ${p.handle} (${p.title} / ${p.type})`);
      continue;
    }
    if (p.colours.length) {
      for (const colour of p.colours) {
        const spec = PALETTE[colour];
        if (!spec) {
          problems.push(`no palette entry for colour "${colour}" (${p.handle})`);
          continue;
        }
        jobs.push({ product: p, tpl, colour, spec, file: `${p.handle}/${slug(colour)}.png`, alt: `${p.title} — ${colour}` });
      }
    } else {
      if (!p.placeholder) {
        problems.push(`${p.handle} has no Colour option and no placehold.co Image Src to take a colour from`);
        continue;
      }
      // Keep the placeholder's colours: bg = garment, fg = accent when it isn't the default cream text.
      const fg = p.placeholder.fg.toLowerCase();
      const spec = { base: p.placeholder.bg, accent: fg !== "#f5f0e8" ? fg : undefined };
      jobs.push({ product: p, tpl, colour: null, spec, file: `${p.handle}/main.png`, alt: p.title });
    }
  }
  return { jobs, problems };
}

function svgFor(job) {
  const c = makeColours(job.spec);
  const art = job.tpl.draw(c);
  return {
    fit: art.fit || 1,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${SIZE}" height="${SIZE}">
${defs(c)}
${background()}
<g id="fit"><g id="art">${art.svg}</g></g>
</svg>`,
  };
}

// --------------------------------------------------------------------------- //
// PNG re-encode (Chromium writes fast/large PNGs; recompress losslessly)
// --------------------------------------------------------------------------- //

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// Decode an 8-bit RGB/RGBA non-interlaced PNG to RGB rows.
function decodePng(buf) {
  let off = 8;
  let width, height, colorType, bitDepth, interlace;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) return null;
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 3);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      out[(y * width + x) * 3] = line[x * bpp];
      out[(y * width + x) * 3 + 1] = line[x * bpp + 1];
      out[(y * width + x) * 3 + 2] = line[x * bpp + 2];
    }
    prev = line;
  }
  return { width, height, rgb: out };
}

// Encode RGB with per-row adaptive filtering (min sum of abs) + zlib level 9.
function encodePng({ width, height, rgb }) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const cur = rgb.subarray(y * stride, (y + 1) * stride);
    const prev = y ? rgb.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = cand[f];
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= 3 ? cur[x - 3] : 0;
        const b = prev[x];
        const c = x >= 3 ? prev[x - 3] : 0;
        let pr = 0;
        if (f === 1) pr = a;
        else if (f === 2) pr = b;
        else if (f === 3) pr = (a + b) >> 1;
        else if (f === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (cur[x] - pr) & 255;
        o[x] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = f;
      }
    }
    raw[y * (stride + 1)] = best;
    cand[best].copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Skia dithers every gradient (±1 noise per channel), which makes flat-colour
// art compress terribly. Replace each pixel in a smooth area (all 8
// neighbours within ±2 on every channel) with the 3×3 mean; edges, stitching
// and text are left untouched. Visually identical, far smaller files.
function dedither({ width, height, rgb }) {
  const out = Buffer.from(rgb);
  const stride = width * 3;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * stride + x * 3;
      let smooth = true;
      const sum = [0, 0, 0];
      for (let dy = -1; dy <= 1 && smooth; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const j = i + dy * stride + dx * 3;
          for (let ch = 0; ch < 3; ch++) {
            const v = rgb[j + ch];
            if (Math.abs(v - rgb[i + ch]) > 2) {
              smooth = false;
              break;
            }
            sum[ch] += v;
          }
          if (!smooth) break;
        }
      }
      if (smooth) {
        out[i] = Math.round(sum[0] / 9);
        out[i + 1] = Math.round(sum[1] / 9);
        out[i + 2] = Math.round(sum[2] / 9);
      }
    }
  }
  return { width, height, rgb: out };
}

function optimise(png) {
  const img = decodePng(png);
  if (!img) return png;
  const out = encodePng(dedither(img));
  return out.length < png.length ? out : png;
}

// --------------------------------------------------------------------------- //
// Render
// --------------------------------------------------------------------------- //

async function renderAll(page, jobs) {
  for (const job of jobs) {
    const { svg, fit } = svgFor(job);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:${BACKGROUND}">${svg}</body></html>`);
    // Fit the art into a consistent box, centred slightly above the middle so
    // the drop shadow has room below.
    await page.evaluate((fit) => {
      // Union of the silhouettes' boxes in #art space (getBBox on the group
      // would include the full-canvas shading rects hidden by clip paths).
      const art = document.getElementById("art");
      const inv = art.getCTM().inverse();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const el of art.querySelectorAll(".sil")) {
        const bb = el.getBBox();
        const m = inv.multiply(el.getCTM());
        for (const [x, y] of [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]]) {
          const p = new DOMPoint(x, y).matrixTransform(m);
          x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
        }
      }
      const b = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      const box = 740 * fit;
      const s = Math.min(box / b.width, box / b.height);
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      document.getElementById("fit").setAttribute("transform", `translate(500 488) scale(${s}) translate(${-cx} ${-cy})`);
    }, fit);
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
    const file = path.join(OUT, job.file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = optimise(png);
    fs.writeFileSync(file, out);
    console.log(`OK    ${job.file.padEnd(52)} ${job.tpl.name.padEnd(18)} ${(out.length / 1024).toFixed(0)} KB`);
  }
}

async function contactSheet(page, jobs) {
  const cells = jobs
    .map((j) => {
      const data = fs.readFileSync(path.join(OUT, j.file)).toString("base64");
      const label = j.colour ? `${j.product.handle}<br><b>${j.colour}</b>` : `${j.product.handle}<br><b>main</b>`;
      return `<figure><img src="data:image/png;base64,${data}"><figcaption>${label}<br><i>${j.tpl.name}</i></figcaption></figure>`;
    })
    .join("");
  const thumb = parseInt(process.env.THUMB || "200", 10);
  const cols = Math.max(2, Math.floor(2140 / (thumb + 14)));
  const html = `<!doctype html><html><head><style>
    body{margin:0;padding:24px;background:#fff;font:12px/1.3 -apple-system,Helvetica,Arial,sans-serif;color:#222;width:${cols * (thumb + 14)}px}
    h1{font-size:18px;margin:0 0 16px}
    .grid{display:grid;grid-template-columns:repeat(${cols},${thumb}px);gap:14px}
    figure{margin:0}img{width:${thumb}px;height:${thumb}px;display:block;border:1px solid #ddd}
    figcaption{margin-top:4px;word-break:break-all}i{color:#888}
  </style></head><body><h1>Harbour Run product images — ${jobs.length} images (${VERSION})</h1><div class="grid">${cells}</div></body></html>`;
  await page.setViewportSize({ width: cols * (thumb + 14) + 48, height: 800 });
  await page.setContent(html);
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  fs.writeFileSync(process.env.SHEET_OUT || path.join(OUT, "contact-sheet.png"), buf);
  console.log(`OK    contact-sheet.png (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  const products = loadProducts();
  const { jobs, problems } = buildJobs(products);
  for (const p of problems) console.warn(`WARN  ${p}`);
  if (problems.length) {
    console.error(`ERROR ${problems.length} product(s)/colour(s) unmapped — fix product_image_templates.mjs`);
    process.exit(1);
  }
  const selected = ONLY.length ? jobs.filter((j) => ONLY.includes(j.product.handle)) : jobs;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
    if (!process.env.SHEET_ONLY) await renderAll(page, selected);
    await contactSheet(page, selected.filter((j) => fs.existsSync(path.join(OUT, j.file))));
  } finally {
    await browser.close();
  }
  if (!ONLY.length) {
    const manifest = { version: VERSION, size: SIZE, products: {} };
    for (const j of jobs) {
      const entry = (manifest.products[j.product.handle] ||= { title: j.product.title, template: j.tpl.name, option: j.colour ? "Colour" : null, images: [] });
      entry.images.push({ colour: j.colour, file: j.file, alt: j.alt });
    }
    fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    const total = jobs.reduce((n, j) => n + fs.statSync(path.join(OUT, j.file)).size, 0);
    console.log(`\n${jobs.length} images · ${(total / 1024 / 1024).toFixed(1)} MB · ${Object.keys(manifest.products).length} products · manifest.json written`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
