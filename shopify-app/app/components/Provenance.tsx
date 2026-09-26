import type { ProvenanceKind } from "../services/board.server";

const CHIP: Record<ProvenanceKind, { short: string; label: string }> = {
  OBSERVED: { short: "Obs", label: "Observed" },
  AGGREGATE_PROXY: { short: "Agg", label: "Aggregate proxy" },
  MODEL_HYPOTHESIS: { short: "Hyp", label: "Model hypothesis" },
  MOCK: { short: "Mock", label: "Mock" },
};

export function ProvenanceChips({ kinds }: { kinds: ProvenanceKind[] }) {
  if (kinds.length === 0) return null;
  return (
    <span className="chip-row">
      {kinds.map((kind) => (
        <span key={kind} className={`prov prov-${kind.toLowerCase()}`} title={CHIP[kind].label}>
          <span className="sr-only">{CHIP[kind].label}</span>
          <span aria-hidden="true">{CHIP[kind].short}</span>
        </span>
      ))}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.75 ? "high" : value >= 0.5 ? "mid" : "low";
  return (
    <div className="confidence" data-confidence={value.toFixed(2)}>
      <div className={`confidence-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      <span className="confidence-label">{pct}%</span>
    </div>
  );
}
