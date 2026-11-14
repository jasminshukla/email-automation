export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fullName(firstName?: string, lastName?: string) {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || 'No name';
}
