'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { Audience, Campaign, Contact, Template } from '../lib/types';
import { IconAudience, IconCampaign, IconPeople, IconTemplate } from './Icons';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState('');
  const [hasApiKey, setHasApiKey] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ data: { hasApiKey: boolean } }>('/api/settings'),
      api<{ data: Contact[] }>('/api/contacts'),
      api<{ data: Audience[] }>('/api/segments'),
      api<{ data: Template[] }>('/api/templates'),
      api<{ data: Campaign[] }>('/api/campaigns'),
    ])
      .then(([settings, contactList, audienceList, templateList, campaignList]) => {
        setHasApiKey(settings.data.hasApiKey);
        setContacts(contactList.data);
        setAudiences(audienceList.data);
        setTemplates(templateList.data);
        setCampaigns(campaignList.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const published = templates.filter((template) => template.status === 'published');
  const scheduled = campaigns.filter((campaign) => campaign.status === 'scheduled');

  return (
    <div>
      <PageHeader
        title={`${greeting()}, Jasmin`}
        description="Contacts, audiences, and campaigns for jasminshukla.com."
        actions={
          <Link className="btn" href="/campaigns/new">
            New campaign
          </Link>
        }
      />

      {!hasApiKey ? (
        <p className="warning">
          Email sending is not connected yet. Ask the developer to add the Resend API key.
        </p>
      ) : null}
      {error ? <p className="warning">{error}</p> : null}

      <div className="stats">
        <div className="stat">
          <div className="stat-top">
            <span>Total contacts</span>
            <span className="stat-icon"><IconPeople /></span>
          </div>
          <strong>{loading ? '—' : contacts.length}</strong>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span>Audiences</span>
            <span className="stat-icon"><IconAudience /></span>
          </div>
          <strong>{loading ? '—' : audiences.length}</strong>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span>Ready templates</span>
            <span className="stat-icon"><IconTemplate /></span>
          </div>
          <strong>{loading ? '—' : published.length}</strong>
        </div>
        <div className="stat">
          <div className="stat-top">
            <span>Scheduled campaigns</span>
            <span className="stat-icon"><IconCampaign /></span>
          </div>
          <strong>{loading ? '—' : scheduled.length}</strong>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Recent campaigns</h3>
            <Link href="/campaigns">View all</Link>
          </div>
          {campaigns.length === 0 ? (
            <p className="muted">
              Nothing scheduled yet. When you are ready, create an audience and
              send the first campaign.
            </p>
          ) : (
            campaigns.slice(0, 6).map((campaign) => (
              <Link
                className="campaign-row"
                key={campaign.id}
                href={`/campaigns?open=${campaign.id}`}
              >
                <div>
                  <strong>{campaign.name}</strong>
                  <div className="muted">
                    {campaign.scheduledAt
                      ? `Sends ${formatDate(campaign.scheduledAt)}`
                      : campaign.sentAt
                        ? `Sent ${formatDate(campaign.sentAt)}`
                        : 'Not scheduled'}
                  </div>
                </div>
                <StatusBadge status={campaign.status} />
              </Link>
            ))
          )}
        </div>
        <div className="card">
          <h3>How to send a campaign</h3>
          <div className="step-list">
            <div className="step-item">
              <span className="step-num">1</span>
              <span>Create an audience, such as Newsletter or Launch list.</span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span>Add contacts and place them in that audience.</span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span>Check Templates and pick the published email design.</span>
            </div>
            <div className="step-item">
              <span className="step-num">4</span>
              <span>Schedule the campaign. Everyone in the audience gets the email.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
