'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Audience, Campaign, CampaignStats } from '../lib/types';
import { EmptyState } from './EmptyState';
import { IconPlus, IconSearch } from './Icons';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

export function CampaignsView() {
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [audienceName, setAudienceName] = useState('');
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<CampaignStats | null>(null);

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

  const openId = params.get('open');

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    setStats(null);
    setDetail(
      campaigns.find((campaign) => campaign.id === openId) || { id: openId, status: '' },
    );
    Promise.all([
      api<{ data: Campaign; stats: CampaignStats }>(`/api/campaigns/${openId}`),
      api<{ data: Audience[] }>('/api/segments'),
    ])
      .then(([campaign, audiences]) => {
        if (cancelled) return;
        setDetail(campaign.data);
        setStats(campaign.stats);
        const segmentId = campaign.data.segmentId || campaign.data.audienceId;
        const match = audiences.data.find((audience) => audience.id === segmentId);
        setAudienceName(match?.name || '');
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err instanceof Error ? err.message : 'Could not load campaign');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Reload only when the opened campaign changes. The list refresh should not wipe the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

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

  function openCampaign(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set('open', id);
    router.replace(`/campaigns?${next.toString()}`);
  }

  function closeCampaign() {
    const next = new URLSearchParams(params.toString());
    next.delete('open');
    const queryString = next.toString();
    router.replace(queryString ? `/campaigns?${queryString}` : '/campaigns');
    setDetail(null);
    setStats(null);
    setAudienceName('');
    setDetailError('');
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
                      <button
                        className="link-btn"
                        type="button"
                        onClick={() => openCampaign(campaign.id)}
                      >
                        <strong>{campaign.name || 'Untitled campaign'}</strong>
                        {campaign.subject ? (
                          <span className="sub">{campaign.subject}</span>
                        ) : null}
                      </button>
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
                        <button
                          className="btn secondary small"
                          type="button"
                          onClick={() => openCampaign(campaign.id)}
                        >
                          Details
                        </button>
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
      {openId && detail ? (
        <Modal title={detail.name || 'Campaign'} wide onClose={closeCampaign}>
          {detailError ? <p className="warning">{detailError}</p> : null}
          {detailLoading ? <p className="hint">Loading campaign…</p> : null}
          <div className="outcome-row">
            <div className="outcome">
              <span>Delivered</span>
              <strong>{stats ? stats.delivered : '—'}</strong>
            </div>
            <div className="outcome">
              <span>Bounced</span>
              <strong>{stats ? stats.bounced : '—'}</strong>
            </div>
            <div className="outcome">
              <span>Not sent yet</span>
              <strong>{stats ? stats.notSent : '—'}</strong>
            </div>
          </div>
          <dl className="detail-list">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={detail.status || 'draft'} />
            </dd>
            <dt>Subject</dt>
            <dd>{detail.subject || '—'}</dd>
            <dt>From</dt>
            <dd>{detail.from || '—'}</dd>
            <dt>Audience</dt>
            <dd>{audienceName || '—'}</dd>
            {detail.previewText ? (
              <>
                <dt>Preview</dt>
                <dd>{detail.previewText}</dd>
              </>
            ) : null}
            {detail.replyTo ? (
              <>
                <dt>Reply to</dt>
                <dd>{detail.replyTo}</dd>
              </>
            ) : null}
            <dt>Created</dt>
            <dd>{formatDate(detail.createdAt)}</dd>
            <dt>Scheduled</dt>
            <dd>{detail.scheduledAt ? formatDate(detail.scheduledAt) : '—'}</dd>
            <dt>Sent</dt>
            <dd>{detail.sentAt ? formatDate(detail.sentAt) : '—'}</dd>
          </dl>
          {detail.html ? (
            <iframe
              className="email-frame"
              title="Campaign email"
              sandbox=""
              srcDoc={detail.html}
            />
          ) : detailLoading ? null : (
            <p className="hint">This campaign has no email body to preview.</p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
