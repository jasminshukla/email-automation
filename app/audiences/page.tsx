import { Suspense } from 'react';
import { AudiencesView } from '../../components/AudiencesView';

export default function AudiencesPage() {
  return (
    <Suspense fallback={<p className="muted">Loading audiences…</p>}>
      <AudiencesView />
    </Suspense>
  );
}
