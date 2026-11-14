import { Suspense } from 'react';
import { CampaignsView } from '../../components/CampaignsView';

export default function CampaignsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading campaigns…</p>}>
      <CampaignsView />
    </Suspense>
  );
}
