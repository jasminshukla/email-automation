'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import type { Audience, Template } from '../lib/types';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

function toIso(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function CampaignComposer() {
  const router = useRouter();
  const { notify } = useToast();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fromDefault, setFromDefault] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testTo, setTestTo] = useState('');
  const [form, setForm] = useState({
    name: '',
    segmentId: '',
    templateId: '',
    from: '',
    subject: '',
    mode: 'schedule' as 'draft' | 'now' | 'schedule',
    scheduledAt: '',
  });

  useEffect(() => {
    Promise.all([
      api<{ data: Audience[] }>('/api/segments'),
      api<{ data: Template[] }>('/api/templates'),
      api<{ data: { fromEmail: string } }>('/api/settings'),
    ])
      .then(([audienceList, templateList, settings]) => {
        const published = templateList.data.filter(
          (template) => template.status === 'published',
        );
        setAudiences(audienceList.data);
        setTemplates(published);
        setFromDefault(settings.data.fromEmail);
        setForm((current) => ({
          ...current,
          from: current.from || settings.data.fromEmail,
          templateId: current.templateId || published[0]?.id || '',
          subject: current.subject || published[0]?.subject || '',
        }));
      })
      .catch((err) => setError(err.message));
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId),
    [form.templateId, templates],
  );
  const selectedAudience = audiences.find((item) => item.id === form.segmentId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          scheduledAt:
            form.mode === 'schedule' ? toIso(form.scheduledAt) : undefined,
        }),
      });
      notify(
        form.mode === 'schedule'
          ? 'Campaign scheduled'
          : form.mode === 'now'
            ? 'Campaign sent'
            : 'Draft saved',
      );
      router.push('/campaigns');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create campaign');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo || !form.templateId) return;
    setSaving(true);
    try {
      await api('/api/send', {
        method: 'POST',
        body: JSON.stringify({
          to: testTo,
          templateId: form.templateId,
          from: form.from,
          subject: form.subject,
        }),
      });
      notify('Test email sent');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send test');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New campaign"
        description="Choose who should get the email, pick the published template, then send now or pick a time."
        actions={
          <Link className="btn secondary" href="/campaigns">
            Back to campaigns
          </Link>
        }
      />
      {error ? <p className="warning">{error}</p> : null}
      {audiences.length === 0 ? (
        <p className="warning">
          Create an audience first, then come back to schedule the send.{' '}
          <Link href="/audiences">Go to Audiences</Link>
        </p>
      ) : null}
      {templates.length === 0 ? (
        <p className="warning">
          A published template is required. Publish one in Resend, then refresh Templates.
        </p>
      ) : null}

      <form className="composer" onSubmit={onSubmit}>
        <section className="composer-section">
          <h3>1. Campaign details</h3>
          <div className="two-col">
            <div className="field">
              <label htmlFor="name">Internal name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="August newsletter"
              />
            </div>
            <div className="field">
              <label htmlFor="subject">Email subject</label>
              <input
                id="subject"
                required
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                placeholder="What’s new this month"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="from">From</label>
            <input
              id="from"
              required
              value={form.from}
              onChange={(event) => setForm({ ...form, from: event.target.value })}
              placeholder="Jasmin <hello@yourdomain.com>"
            />
            <span className="hint">Use a verified sending address.</span>
          </div>
        </section>

        <section className="composer-section">
          <h3>2. Who should receive it?</h3>
          <div className="cards">
            {audiences.map((audience) => (
              <button
                key={audience.id}
                type="button"
                className={`choice ${form.segmentId === audience.id ? 'active' : ''}`}
                onClick={() => setForm({ ...form, segmentId: audience.id })}
              >
                <h4>{audience.name}</h4>
                <p className="hint">Everyone on this list will get the email</p>
              </button>
            ))}
          </div>
          {!form.segmentId ? (
            <p className="hint">Select an audience to continue.</p>
          ) : null}
        </section>

        <section className="composer-section">
          <h3>3. Template</h3>
          <div className="cards">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`choice ${form.templateId === template.id ? 'active' : ''}`}
                onClick={() =>
                  setForm({
                    ...form,
                    templateId: template.id,
                    subject: form.subject || template.subject || '',
                    from: form.from || template.from || fromDefault,
                  })
                }
              >
                <h4>{template.name}</h4>
                <StatusBadge status={template.status} />
              </button>
            ))}
          </div>
          {selectedTemplate ? (
            <p className="hint">
              Using <strong>{selectedTemplate.name}</strong>
              {selectedAudience ? ` for ${selectedAudience.name}` : ''}.
            </p>
          ) : null}
        </section>

        <section className="composer-section">
          <h3>4. When should it send?</h3>
          <div className="cards">
            <button
              type="button"
              className={`choice ${form.mode === 'schedule' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, mode: 'schedule' })}
            >
              <h4>Schedule</h4>
              <p className="hint">Pick a date and time</p>
            </button>
            <button
              type="button"
              className={`choice ${form.mode === 'now' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, mode: 'now' })}
            >
              <h4>Send now</h4>
              <p className="hint">Deliver immediately</p>
            </button>
            <button
              type="button"
              className={`choice ${form.mode === 'draft' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, mode: 'draft' })}
            >
              <h4>Save draft</h4>
              <p className="hint">Come back and send later</p>
            </button>
          </div>
          {form.mode === 'schedule' ? (
            <div className="field">
              <label htmlFor="scheduledAt">Send at</label>
              <input
                id="scheduledAt"
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm({ ...form, scheduledAt: event.target.value })
                }
              />
            </div>
          ) : null}
        </section>

        <div className="actions">
          <button className="btn" disabled={saving || templates.length === 0 || !form.segmentId}>
            {saving
              ? 'Working…'
              : form.mode === 'schedule'
                ? 'Schedule campaign'
                : form.mode === 'now'
                  ? 'Send campaign'
                  : 'Save draft'}
          </button>
        </div>

        <div className="test-box">
          <h3>Send myself a test</h3>
          <p className="hint">This sends one copy of the template to a single inbox. It does not email the audience.</p>
          <div className="two-col">
            <div className="field">
              <label htmlFor="testTo">Your email</label>
              <input
                id="testTo"
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button
                className="btn secondary"
                type="button"
                disabled={saving || !testTo || !form.templateId}
                onClick={sendTest}
              >
                Send test
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
