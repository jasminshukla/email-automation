'use client';

import Link from 'next/link';
import { DragEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { htmlFromUpload, titleFromHtml } from '../lib/html-zip';
import type { Template } from '../lib/types';
import { EmptyState } from './EmptyState';
import { IconPlus } from './Icons';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

const starterHtml = `<div style="font-family:Georgia,serif;line-height:1.6;color:#1c2430;">
  <p>Hello,</p>
  <p>Write your note here.</p>
  <p>Jasmin Shukla</p>
</div>`;

const emptyTemplate = {
  name: '',
  subject: '',
  from: '',
  html: starterHtml,
  publish: true,
};

export function TemplatesView() {
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyTemplate);
  const [dropping, setDropping] = useState(false);
  const [uploadName, setUploadName] = useState('');

  async function load() {
    const result = await api<{ data: Template[] }>('/api/templates');
    setTemplates(result.data);
    setError('');
    const firstReady = result.data.find((item) => item.status === 'published') || result.data[0];
    if (firstReady) {
      const detail = await api<{ data: Template }>(`/api/templates/${firstReady.id}`);
      setSelected(detail.data);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (params.get('new') === '1') setOpen(true);
  }, [params]);

  useEffect(() => {
    if (!open) return;
    api<{ data: { fromEmail: string } }>('/api/settings')
      .then((settings) => {
        setForm((current) => ({
          ...current,
          from: current.from || settings.data.fromEmail,
        }));
      })
      .catch(() => undefined);
  }, [open]);

  function closeCreate() {
    setOpen(false);
    setForm(emptyTemplate);
    setUploadName('');
    setDropping(false);
    if (params.get('new')) router.replace('/templates');
  }

  async function useUpload(file: File) {
    try {
      const html = await htmlFromUpload(file);
      const baseName = file.name.replace(/\.(zip|html?)$/i, '');
      const title = titleFromHtml(html);
      setForm((current) => ({
        ...current,
        html,
        name: current.name || baseName,
        subject: current.subject || title,
      }));
      setUploadName(file.name);
      notify('HTML loaded from the file');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not read that file');
    }
  }

  function dropUpload(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDropping(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void useUpload(file);
  }

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api<{ data: Template }>('/api/templates', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify(form.publish ? 'Template published' : 'Template saved as a draft');
      closeCreate();
      await load();
      setSelected(result.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create template');
    } finally {
      setSaving(false);
    }
  }

  async function inspect(template: Template) {
    try {
      const result = await api<{ data: Template }>(`/api/templates/${template.id}`);
      setSelected(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load template');
    }
  }

  const published = templates.filter((template) => template.status === 'published');

  return (
    <div>
      <PageHeader
        title="Email Templates"
        description="Published designs from Resend. A campaign uses one of these."
        actions={
          <>
            <button className="btn" type="button" onClick={() => setOpen(true)}>
              <IconPlus /> New template
            </button>
            <Link className="btn secondary" href="/campaigns/new">
              Use in campaign
            </Link>
          </>
        }
      />
      {error ? <p className="warning">{error}</p> : null}
      {templates.length === 0 ? (
        <div className="table-wrap">
          <EmptyState
            title="No templates to show"
            description="Create a template here, then publish it so a campaign can use it."
            action={
              <button className="btn" type="button" onClick={() => setOpen(true)}>
                New template
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid-2">
          <div className="cards">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${selected?.id === template.id ? 'active' : ''}`}
                onClick={() => inspect(template)}
              >
                <div className="tpl-sketch" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <h4>{template.name}</h4>
                <StatusBadge status={template.status} />
                <p className="hint">
                  {template.status === 'published'
                    ? 'Ready to use in a campaign'
                    : 'Publish this before sending'}
                </p>
              </button>
            ))}
          </div>
          <div className="card">
            <h3>{selected?.name || 'Preview'}</h3>
            {selected ? (
              <>
                <p className="muted">{selected.subject || 'No subject saved on this template'}</p>
                <div
                  className="preview"
                  dangerouslySetInnerHTML={{
                    __html: selected.html || '<p>This template has no HTML yet.</p>',
                  }}
                />
              </>
            ) : (
              <p className="muted">
                {published.length} ready template{published.length === 1 ? '' : 's'}. Click one to preview.
              </p>
            )}
          </div>
        </div>
      )}

      {open ? (
        <Modal title="New template" onClose={closeCreate} wide>
          <form className="form-grid" onSubmit={createTemplate}>
            <div className="field">
              <label htmlFor="templateName">Name</label>
              <input
                id="templateName"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="August newsletter"
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label htmlFor="templateSubject">Subject</label>
                <input
                  id="templateSubject"
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="What’s new this month"
                />
              </div>
              <div className="field">
                <label htmlFor="templateFrom">From</label>
                <input
                  id="templateFrom"
                  value={form.from}
                  onChange={(event) => setForm({ ...form, from: event.target.value })}
                  placeholder="Jasmin <hello@jasminshukla.com>"
                />
              </div>
            </div>
            <label
              className={dropping ? 'file-drop over' : 'file-drop'}
              onDragOver={(event) => {
                event.preventDefault();
                setDropping(true);
              }}
              onDragLeave={() => setDropping(false)}
              onDrop={dropUpload}
            >
              <strong>Upload an HTML zip</strong>
              <span className="hint">
                {uploadName || 'Drop a .zip or .html file here, or click to choose one.'}
              </span>
              <input
                type="file"
                accept=".zip,.html,.htm,application/zip,text/html"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void useUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
            <div className="field">
              <label htmlFor="templateHtml">Email content</label>
              <textarea
                id="templateHtml"
                required
                rows={10}
                value={form.html}
                onChange={(event) => setForm({ ...form, html: event.target.value })}
              />
              <span className="hint">HTML is saved in Resend. An unsubscribe link is added automatically.</span>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={form.publish}
                onChange={(event) => setForm({ ...form, publish: event.target.checked })}
              />
              Publish now so campaigns can use it
            </label>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : form.publish ? 'Create and publish' : 'Save draft'}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
