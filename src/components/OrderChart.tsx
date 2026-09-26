import { orderDays } from '../../app/data/fixture.ts';

const kindLabel = {
  match: 'Match day',
  away: 'Away weekend',
  gift: 'Gift window',
  other: 'Other day',
} as const;

export function OrderChart() {
  const max = Math.max(...orderDays.map((day) => day.orders));

  return (
    <figure className="chart-figure">
      <div className="chart" aria-hidden="true">
        {orderDays.map((day) => (
          <div key={day.date} className={`chart__col chart__col--${day.kind}`}>
            <div className="chart__plot">
              <div className="chart__bar" style={{ height: `${(day.orders / max) * 100}%` }} />
            </div>
            <span className="chart__label">
              {day.weekday.slice(0, 1)}
              <span className="chart__day">{day.day}</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="chart__caption">Orders by day, 7–20 Sept 2026. Saturday 19 Sept is the home-kit rush.</figcaption>
      <ul className="legend">
        <li><span className="swatch swatch--match" /> Match day</li>
        <li><span className="swatch swatch--away" /> Away weekend</li>
        <li><span className="swatch swatch--gift" /> Gift window</li>
        <li><span className="swatch swatch--other" /> Other days</li>
      </ul>
      <table className="sr-only">
        <caption>Orders by day from 7 to 20 September 2026</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Orders</th>
            <th>Window</th>
          </tr>
        </thead>
        <tbody>
          {orderDays.map((day) => (
            <tr key={day.date}>
              <td>{day.weekday} {day.day} Sept</td>
              <td>{day.orders}</td>
              <td>{kindLabel[day.kind]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
