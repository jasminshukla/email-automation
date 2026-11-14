import { Suspense } from 'react';
import { TemplatesView } from '../../components/TemplatesView';

export default function TemplatesPage() {
  return (
    <Suspense fallback={<p className="muted">Loading templates…</p>}>
      <TemplatesView />
    </Suspense>
  );
}
