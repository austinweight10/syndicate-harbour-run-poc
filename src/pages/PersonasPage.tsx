import { Page, Text } from '@shopify/polaris';
import { Link } from 'react-router-dom';
import { events, personas } from '../../app/data/fixture.ts';
import { EvidenceBadge } from '../components/EvidenceBadge.tsx';
import { formatMoney } from '../lib/format.ts';
import { useTitle } from '../lib/useTitle.ts';

export function PersonasPage() {
  useTitle('Personas');

  return (
    <Page
      title="Personas"
      subtitle="Away-day dad is a labelled mock. The other names are hypotheses. Budgets and sizes come from the baskets."
    >
      <div className="persona-grid">
        {personas.map((persona) => {
          const event = events.find((item) => item.id === persona.eventId);
          return (
            <Link key={persona.id} to={`/personas/${persona.id}`} className="persona-card">
              <span className="persona-card__top">
                <span className="persona-card__name">{persona.name}</span>
                <EvidenceBadge kind={persona.nameEvidence} />
              </span>
              <Text as="p" variant="bodySm" tone="subdued">
                {event ? event.name : 'No linked event'}
              </Text>
              <p className="persona-card__budget">
                {formatMoney(persona.budgetMin)} – {formatMoney(persona.budgetMax)}
              </p>
              <ul className="persona-card__goals">
                {persona.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
