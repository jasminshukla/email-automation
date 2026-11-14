'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Campaign } from '../lib/types';
import { EmptyState } from './EmptyState';
import { IconPlus, IconSearch } from './Icons';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

export function CampaignsView() {
  const { notify } = useToast();
  const params = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const result = await api<{ data: Campaign[] }>('/api/campaigns');
      setCampaigns(result.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setQuery(params.get('q') || '');
  }, [params]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return campaigns;
    return campaigns.filter((campaign) =>
      (campaign.name || '').toLowerCase().includes(needle),
    );
  }, [campaigns, query]);

  async function sendNow(id: string) {
    setBusyId(id);
    try {
      await api(`/api/campaigns/${id}/send`, { method: 'POST', body: '{}' });
      notify('Campaign is sending');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send campaign');
    } finally {
      setBusyId('');
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await api(`/api/campaigns/${id}/cancel`, { method: 'POST' });
      notify('Campaign canceled');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not cancel campaign');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <PageHeader
        title="Email Campaigns"
        description="Schedule a send to one audience. Drafts stay here until you send them."
        actions={
          <Link className="btn" href="/campaigns/new">
            <IconPlus /> New campaign
          </Link>
        }
      />
      {error ? <p className="warning">{error}</p> : null}
      <div className="table-wrap">
        {loading ? (
          <p className="hint pad">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create an audience, add contacts, then schedule the first email from here."
            action={
              <Link className="btn" href="/campaigns/new">
                New campaign
              </Link>
            }
          />
        ) : (
          <>
            <div className="toolbar">
              <div className="search">
                <IconSearch />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search campaigns"
                  aria-label="Search campaigns"
                />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th className="hide-sm">Scheduled</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.name || 'Untitled campaign'}</strong>
                    </td>
                    <td>
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="hide-sm">
                      {campaign.scheduledAt
                        ? formatDate(campaign.scheduledAt)
                        : campaign.sentAt
                          ? `Sent ${formatDate(campaign.sentAt)}`
                          : '—'}
                    </td>
                    <td>
                      <div className="row-actions">
                        {campaign.status === 'draft' ? (
                          <button
                            className="btn small"
                            type="button"
                            disabled={busyId === campaign.id}
                            onClick={() => sendNow(campaign.id)}
                          >
                            Send now
                          </button>
                        ) : null}
                        {campaign.status === 'scheduled' || campaign.status === 'queued' ? (
                          <button
                            className="btn danger small"
                            type="button"
                            disabled={busyId === campaign.id}
                            onClick={() => cancel(campaign.id)}
                          >
                            Cancel send
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No campaigns match this search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
