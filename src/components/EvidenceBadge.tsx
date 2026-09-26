import type { EvidenceKind } from '../../app/data/types.ts';
import { evidenceCopy } from '../lib/labels.ts';

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  const copy = evidenceCopy[kind];
  return (
    <span className={`evidence evidence--${kind}`} title={copy.hint}>
      {copy.label}
    </span>
  );
}
