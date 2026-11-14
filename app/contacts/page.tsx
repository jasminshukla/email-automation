import { Suspense } from 'react';
import { ContactsView } from '../../components/ContactsView';

export default function ContactsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading contacts…</p>}>
      <ContactsView />
    </Suspense>
  );
}
