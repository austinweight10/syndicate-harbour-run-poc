import { formatPercent } from '../lib/format.ts';

export function ShareList({ items }: { items: { label: string; share: number }[] }) {
  return (
    <ul className="shares">
      {items.map((item) => (
        <li key={item.label}>
          <div className="shares__row">
            <span>{item.label}</span>
            <span>{formatPercent(item.share)}</span>
          </div>
          <div className="shares__track" aria-hidden="true">
            <div className="shares__fill" style={{ width: formatPercent(item.share) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
