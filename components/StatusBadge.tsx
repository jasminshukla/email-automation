const labels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  queued: 'Sending',
  sent: 'Sent',
  published: 'Ready',
  canceled: 'Canceled',
  failed: 'Failed',
  subscribed: 'Subscribed',
  unsubscribed: 'Unsubscribed',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const value = (status || 'draft').toLowerCase();
  return <span className={`badge ${value}`}>{labels[value] || status}</span>;
}
