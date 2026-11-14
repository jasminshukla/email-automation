import type { Audience, Campaign, Contact, Template } from './types';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as unknown as Record<string, unknown>;
  }
  return {};
}

export function normalizeContact(value: unknown): Contact {
  const item = asRecord(value);
  return {
    id: String(item.id || ''),
    email: String(item.email || ''),
    firstName: String(item.firstName || item.first_name || ''),
    lastName: String(item.lastName || item.last_name || ''),
    unsubscribed: Boolean(item.unsubscribed),
    createdAt: item.createdAt
      ? String(item.createdAt)
      : item.created_at
        ? String(item.created_at)
        : undefined,
  };
}

export function normalizeAudience(value: unknown): Audience {
  const item = asRecord(value);
  return {
    id: String(item.id || ''),
    name: String(item.name || 'Untitled audience'),
    createdAt: item.createdAt
      ? String(item.createdAt)
      : item.created_at
        ? String(item.created_at)
        : undefined,
  };
}

export function normalizeTemplate(value: unknown): Template {
  const item = asRecord(value);
  const variables = Array.isArray(item.variables)
    ? item.variables.map((variable) => {
        const value = variable as Record<string, unknown>;
        return {
          key: String(value.key || ''),
          type: value.type ? String(value.type) : undefined,
          fallbackValue:
            value.fallbackValue != null
              ? String(value.fallbackValue)
              : value.fallback_value != null
                ? String(value.fallback_value)
                : null,
        };
      })
    : [];

  return {
    id: String(item.id || ''),
    name: String(item.name || item.alias || 'Untitled template'),
    alias: item.alias ? String(item.alias) : null,
    status: String(item.status || 'draft'),
    subject: item.subject ? String(item.subject) : null,
    from: item.from ? String(item.from) : null,
    html: item.html ? String(item.html) : null,
    publishedAt: item.publishedAt
      ? String(item.publishedAt)
      : item.published_at
        ? String(item.published_at)
        : null,
    createdAt: item.createdAt
      ? String(item.createdAt)
      : item.created_at
        ? String(item.created_at)
        : undefined,
    updatedAt: item.updatedAt
      ? String(item.updatedAt)
      : item.updated_at
        ? String(item.updated_at)
        : undefined,
    variables,
  };
}

export function normalizeCampaign(value: unknown): Campaign {
  const item = asRecord(value);
  return {
    id: String(item.id || ''),
    name: item.name ? String(item.name) : 'Untitled campaign',
    audienceId: item.audienceId
      ? String(item.audienceId)
      : item.audience_id
        ? String(item.audience_id)
        : null,
    segmentId: item.segmentId
      ? String(item.segmentId)
      : item.segment_id
        ? String(item.segment_id)
        : null,
    status: String(item.status || 'draft'),
    createdAt: item.createdAt
      ? String(item.createdAt)
      : item.created_at
        ? String(item.created_at)
        : null,
    scheduledAt: item.scheduledAt
      ? String(item.scheduledAt)
      : item.scheduled_at
        ? String(item.scheduled_at)
        : null,
    sentAt: item.sentAt
      ? String(item.sentAt)
      : item.sent_at
        ? String(item.sent_at)
        : null,
  };
}

export function listFrom(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as Record<string, unknown>[];
  }
  return [];
}
