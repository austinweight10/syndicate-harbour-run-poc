import { useId } from "react";

/*
 * Syndicate identity v1 — three identical pieces, rotated 120°, filling one
 * point-up hexagon of radius 100 (geometry from syndicate-brand-v1/source/build.py).
 */
const PIECE =
  "M0,0 C-42,28 -82,-8 -86.60254038,-50 L0,-100 L86.60254038,-50 C47.92820323,-67.01408311 -3.24871131,-50.37306696 0,0 Z";
const SEAM = "M0,0 C-42,28 -82,-8 -86.60254038,-50";
const TURNS = [0, 120, 240] as const;

export const BRAND = {
  charcoal: "#252522",
  cream: "#F5F1E8",
  warmGrey: "#8E8B83",
  lightGrey: "#CCC7BC",
} as const;

/** Monochrome symbol. Fill follows `currentColor`; `seam` should match the surface behind it. */
export function BrandSymbol({
  size = 24,
  seam = BRAND.cream,
  className,
  title,
}: {
  size?: number;
  seam?: string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {TURNS.map((turn) => (
        <path key={turn} d={PIECE} transform={`rotate(${turn})`} fill="currentColor" />
      ))}
      {TURNS.map((turn) => (
        <path key={`s${turn}`} d={SEAM} transform={`rotate(${turn})`} fill="none" stroke={seam} strokeWidth={7} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** Tonal symbol — the three pieces in charcoal, warm grey and light grey, no seams. */
export function BrandSymbolTonal({
  size = 64,
  tones = [BRAND.charcoal, BRAND.warmGrey, BRAND.lightGrey],
  className,
}: {
  size?: number;
  tones?: readonly [string, string, string];
  className?: string;
}) {
  return (
    <svg className={className} width={size} height={size} viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">
      {TURNS.map((turn, i) => (
        <path key={turn} d={PIECE} transform={`rotate(${turn})`} fill={tones[i]} />
      ))}
    </svg>
  );
}

/** Inline paths for drawing the mark inside another SVG (e.g. graph nodes). Radius 100 → scale as needed. */
export function BrandGlyph({ scale, fill, seam }: { scale: number; fill: string; seam: string }) {
  return (
    <g transform={`scale(${scale})`} pointerEvents="none">
      {TURNS.map((turn) => (
        <path key={turn} d={PIECE} transform={`rotate(${turn})`} fill={fill} />
      ))}
      {TURNS.map((turn) => (
        <path key={`s${turn}`} d={SEAM} transform={`rotate(${turn})`} fill="none" stroke={seam} strokeWidth={9} strokeLinecap="round" />
      ))}
    </g>
  );
}

const SQRT3 = Math.sqrt(3);
const R = 100;
const COL = SQRT3 * R; // horizontal centre spacing
const ROW = 1.5 * R; // vertical row spacing
// Period: 3 columns × 2 rows so tone permutations vary but still tile seamlessly.
const TILE_W = COL * 3;
const TILE_H = ROW * 2;
const PERMS: [number, number, number][] = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
  [0, 2, 1],
  [2, 1, 0],
  [1, 0, 2],
];

/**
 * Gapless edge-to-edge repeat of the identity, as an SVG pattern.
 * Fills its parent; tune `scale` for tile size and `tones` for the palette.
 */
export function BrandPattern({
  tones = [BRAND.charcoal, BRAND.warmGrey, BRAND.lightGrey],
  scale = 0.3,
  className,
}: {
  tones?: readonly [string, string, string];
  scale?: number;
  className?: string;
}) {
  const id = `brand-pattern-${useId().replace(/:/g, "")}`;
  const hexes: { x: number; y: number; perm: [number, number, number] }[] = [];
  for (let j = -1; j <= 2; j += 1) {
    for (let i = -1; i <= 3; i += 1) {
      const x = i * COL + (Math.abs(j) % 2 === 1 ? COL / 2 : 0);
      const y = j * ROW;
      const ci = ((i % 3) + 3) % 3;
      const rj = ((j % 2) + 2) % 2;
      hexes.push({ x, y, perm: PERMS[ci + rj * 3] });
    }
  }
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <defs>
        <pattern
          id={id}
          width={TILE_W}
          height={TILE_H}
          patternUnits="userSpaceOnUse"
          patternTransform={`scale(${scale})`}
        >
          {hexes.map(({ x, y, perm }) => (
            <g key={`${x}-${y}`} transform={`translate(${x.toFixed(3)} ${y})`}>
              {TURNS.map((turn, k) => (
                <path key={turn} d={PIECE} transform={`rotate(${turn})`} fill={tones[perm[k]]} stroke={tones[perm[k]]} strokeWidth={0.6} />
              ))}
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Dark, low-contrast tonal pattern for charcoal surfaces. */
export const DARK_TONES = ["#252522", "#2d2d29", "#353531"] as const;
