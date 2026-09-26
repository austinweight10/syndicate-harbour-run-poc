import { Card, EmptyState, Page } from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useTitle } from '../lib/useTitle.ts';

export function ResourceMissing({
  title,
  heading,
  body,
  action,
  to,
}: {
  title: string;
  heading: string;
  body: string;
  action: string;
  to: string;
}) {
  const navigate = useNavigate();
  useTitle(title);

  return (
    <Page title={title}>
      <Card>
        <EmptyState heading={heading} image="/empty.svg" action={{ content: action, onAction: () => navigate(to) }}>
          <p>{body}</p>
        </EmptyState>
      </Card>
    </Page>
  );
}
