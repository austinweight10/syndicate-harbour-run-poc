import { formatScore } from '../lib/format.ts';

export function ScoreMeter({ score, tone }: { score: number; tone: 'resonate' | 'friction' }) {
  const width = `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
  return (
    <div className={`meter meter--${tone}`} role="img" aria-label={`Score ${formatScore(score)} out of 1`}>
      <div className="meter__track" aria-hidden="true">
        <div className="meter__fill" style={{ width }} />
      </div>
      <span className="meter__value">{formatScore(score)}</span>
    </div>
  );
}
