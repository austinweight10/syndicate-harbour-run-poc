import { useEffect, useRef } from "react";

const ROWS = [
  {
    term: "Seen",
    kind: "observed",
    body: "From your shop orders or catalogue — for example kit SKUs sold on race weekend.",
  },
  {
    term: "Proxy",
    kind: "aggregate_proxy",
    body: "An external signal such as city weather, postcode area, or hashtag buzz.",
  },
  {
    term: "Estimate",
    kind: "model_hypothesis",
    body: "A model guess (confidence residual or a polished name) — not a direct observation.",
  },
  {
    term: "Demo",
    kind: "mock",
    body: "Seeded stand-in data for the demo, such as a parkrun-shaped race.",
  },
] as const;

export function EnrichmentLegendModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal">
      <button type="button" className="modal-backdrop" aria-label="Close evidence labels" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="enrichment-title">
        <h2 id="enrichment-title">Evidence labels</h2>
        <p className="muted">Every signal is tagged with where it came from, so you know what to trust.</p>
        <ul className="legend-list">
          {ROWS.map((row) => (
            <li key={row.term}>
              <span className={`prov prov-${row.kind}`}>{row.term}</span>
              <span>{row.body}</span>
            </li>
          ))}
        </ul>
        <p className="muted modal-foot">Social buzz alone is never labelled as seen demand.</p>
        <button type="button" className="button" ref={closeRef} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
