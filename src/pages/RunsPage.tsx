import { IndexTable, Link, Page, Text } from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { getPersona, runsNewestFirst } from '../../app/data/fixture.ts';
import { OutcomeBadge } from '../components/OutcomeBadge.tsx';
import { formatDateTime, formatDuration } from '../lib/format.ts';
import { useCondensed } from '../lib/useCondensed.ts';
import { useTitle } from '../lib/useTitle.ts';

export function RunsPage() {
  useTitle('Agent runs');
  const navigate = useNavigate();
  const condensed = useCondensed();
  const runs = runsNewestFirst();

  return (
    <Page
      title="Agent runs"
      subtitle="Sample replays against the fixture storefront. The morning run reached checkout and stopped. No payment was taken."
      primaryAction={{ content: 'Open completed run', url: '/runs/run_away_dad' }}
    >
      <div className="table-card">
        <IndexTable
          resourceName={{ singular: 'run', plural: 'runs' }}
          itemCount={runs.length}
          selectable={false}
          condensed={condensed}
          headings={[
            { title: 'Run' },
            { title: 'Persona' },
            { title: 'Started' },
            { title: 'Duration' },
            { title: 'Outcome' },
          ]}
        >
          {runs.map((run, index) => {
            const persona = getPersona(run.personaId);
            return (
              <IndexTable.Row id={run.id} key={run.id} position={index} onClick={() => navigate(`/runs/${run.id}`)}>
                <IndexTable.Cell>
                  <Link dataPrimaryLink url={`/runs/${run.id}`} removeUnderline>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {run.title}
                    </Text>
                  </Link>
                  <div className="cell-sub">{run.status === 'failed' ? 'Failed' : 'Completed'}</div>
                </IndexTable.Cell>
                <IndexTable.Cell>{persona?.name ?? run.personaId}</IndexTable.Cell>
                <IndexTable.Cell>{formatDateTime(run.startedAt)}</IndexTable.Cell>
                <IndexTable.Cell>{formatDuration(run.startedAt, run.endedAt)}</IndexTable.Cell>
                <IndexTable.Cell>
                  <OutcomeBadge outcome={run.outcome} />
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
      </div>
    </Page>
  );
}
