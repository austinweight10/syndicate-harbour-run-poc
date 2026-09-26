import { useEffect, useRef } from "react";

const ROWS = [
  {
    term: "Observed",
    body: "Shop orders and catalogue, for example home-kit SKUs sold on Saturday.",
  },
  {
    term: "Aggregate proxy",
    body: "Open-Meteo city weather, postcode-sector geo, and hashtag watchlist buzz.",
  },
  {
    term: "Model hypothesis",
    body: "Confidence residual, or a name polished by a template. Marked Hyp.",
  },
  {
    term: "Mock",
    body: "Seeded stand-ins such as a parkrun-shaped race, a virtual challenge, or a Hyrox meet.",
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
      <button type="button" className="modal-backdrop" aria-label="Close enrichment labels" onClick={onClose} />
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="enrichment-title">
        <h2 id="enrichment-title">Enrichment labels</h2>
        <ul className="legend-list">
          {ROWS.map((row) => (
            <li key={row.term}>
              <strong>{row.term}</strong>
              <span>{row.body}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Social buzz on its own is never labelled as observed demand.</p>
        <button type="button" className="button button-quiet" ref={closeRef} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
