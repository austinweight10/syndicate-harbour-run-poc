import type { ProvenanceKind } from "../services/board.server";

const CHIP: Record<ProvenanceKind, { short: string; label: string }> = {
  OBSERVED: { short: "Seen", label: "Seen in your shop orders or catalogue" },
  AGGREGATE_PROXY: { short: "Proxy", label: "External signal (weather, area, or buzz)" },
  MODEL_HYPOTHESIS: { short: "Estimate", label: "Model estimate — not a direct observation" },
  MOCK: { short: "Demo", label: "Demo / seeded stand-in data" },
};

export function ProvenanceChips({ kinds }: { kinds: ProvenanceKind[] }) {
  if (kinds.length === 0) return null;
  return (
    <span className="chip-row" aria-label="Evidence labels">
      {kinds.map((kind) => (
        <span key={kind} className={`prov prov-${kind.toLowerCase()}`} title={CHIP[kind].label}>
          <span className="sr-only">{CHIP[kind].label}</span>
          <span aria-hidden="true">{CHIP[kind].short}</span>
        </span>
      ))}
    </span>
  );
}

export function confidenceTone(value: number): "high" | "mid" | "low" {
  return value >= 0.75 ? "high" : value >= 0.5 ? "mid" : "low";
}

export function ConfidenceBar({ value, label = "confidence" }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="confidence" data-confidence={value.toFixed(2)}>
      <div className="confidence-track">
        <div className={`confidence-fill tone-${confidenceTone(value)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="confidence-label">
        <strong>{pct}%</strong> {label}
      </span>
    </div>
  );
}

export function ConfidenceRing({
  value,
  size = 96,
  stroke = 9,
  inverse = false,
}: {
  value: number;
  size?: number;
  stroke?: number;
  inverse?: boolean;
}) {
  const pct = Math.round(value * 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={inverse ? "ring ring-inverse" : "ring"}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% confidence`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ring-fill tone-stroke-${confidenceTone(value)}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          style={{ ["--ring-c" as string]: c }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-value" style={{ fontSize: Math.round(size * 0.26) }}>
        {pct}
        <small>%</small>
      </span>
    </div>
  );
}
