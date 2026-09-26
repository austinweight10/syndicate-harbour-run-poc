import { ResourceMissing } from '../components/ResourceMissing.tsx';

export function NotFoundPage() {
  return (
    <ResourceMissing
      title="Page not found"
      heading="That page is not in Syndicate"
      body="Use the app menu for Overview, Events, Personas, Insights, Agent runs, or Settings."
      action="Back to overview"
      to="/"
    />
  );
}
