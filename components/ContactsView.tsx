'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { fullName } from '../lib/format';
import type { Audience, Contact } from '../lib/types';
import { EmptyState } from './EmptyState';
import { IconPlus, IconSearch } from './Icons';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { StatusBadge } from './StatusBadge';
import { useToast } from './Toast';

const emptyContact = {
  email: '',
  firstName: '',
  lastName: '',
  segmentId: '',
};

export function ContactsView() {
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<Contact | null>(null);
  const [addTo, setAddTo] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyContact);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    unsubscribed: false,
  });
  const [segmentId, setSegmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [contactList, audienceList] = await Promise.all([
        api<{ data: Contact[] }>('/api/contacts'),
        api<{ data: Audience[] }>('/api/segments'),
      ]);
      setContacts(contactList.data);
      setAudiences(audienceList.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load contacts');
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setQuery(params.get('q') || '');
    if (params.get('new') === '1') setCreateOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((contact) =>
      [contact.email, contact.firstName, contact.lastName]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [contacts, query]);

  async function createContact(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Contact added to the list');
      setCreateOpen(false);
      setForm(emptyContact);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create contact');
    } finally {
      setSaving(false);
    }
  }

  async function updateContact(event: FormEvent) {
    event.preventDefault();
    if (!edit) return;
    setSaving(true);
    try {
      await api(`/api/contacts/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      notify('Contact updated');
      setEdit(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setSaving(false);
    }
  }

  async function addContactToAudience(event: FormEvent) {
    event.preventDefault();
    if (!addTo || !segmentId) return;
    setSaving(true);
    try {
      await api(`/api/contacts/${addTo.id}/segments`, {
        method: 'POST',
        body: JSON.stringify({ segmentId }),
      });
      notify('Contact added to the audience');
      setAddTo(null);
      setSegmentId('');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Every person on the list, ready to place in an audience."
        actions={
          <button className="btn" type="button" onClick={() => setCreateOpen(true)}>
            <IconPlus /> Add contact
          </button>
        }
      />
      {error ? <p className="warning">{error}</p> : null}
      <div className="table-wrap">
        {contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description="Add the first person, then put them in an audience so they can receive campaigns."
            action={
              <button className="btn" type="button" onClick={() => setCreateOpen(true)}>
                Add contact
              </button>
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
                  placeholder="Search name or email"
                  aria-label="Search contacts"
                />
              </div>
            </div>
            <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <div className="person">
                      <strong>{fullName(contact.firstName, contact.lastName)}</strong>
                      <span>{contact.email}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={contact.unsubscribed ? 'unsubscribed' : 'subscribed'}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn secondary small"
                        type="button"
                        onClick={() => {
                          setEdit(contact);
                          setEditForm({
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            unsubscribed: contact.unsubscribed,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary small"
                        type="button"
                        onClick={() => setAddTo(contact)}
                      >
                        Add to audience
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No contacts match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="table-foot">
            <span>{filtered.length} contacts</span>
          </div>
          </>
        )}
      </div>

      {createOpen ? (
        <Modal
          title="New contact"
          onClose={() => {
            setCreateOpen(false);
            if (params.get('new')) {
              const next = query ? `/contacts?q=${encodeURIComponent(query)}` : '/contacts';
              router.replace(next);
            }
          }}
        >
          <p className="hint">They will be saved to Resend and can be added to any audience.</p>
          <form className="form-grid" onSubmit={createContact}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                placeholder="alex@company.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({ ...form, firstName: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm({ ...form, lastName: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="segmentId">Add to audience now</label>
              <select
                id="segmentId"
                value={form.segmentId}
                onChange={(event) =>
                  setForm({ ...form, segmentId: event.target.value })
                }
              >
                <option value="">Skip for now</option>
                {audiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save contact'}
            </button>
          </form>
        </Modal>
      ) : null}

      {edit ? (
        <Modal title="Update contact" onClose={() => setEdit(null)}>
          <p className="hint">{edit.email}</p>
          <form className="form-grid" onSubmit={updateContact}>
            <div className="two-col">
              <div className="field">
                <label htmlFor="editFirstName">First name</label>
                <input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm({ ...editForm, firstName: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="editLastName">Last name</label>
                <input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm({ ...editForm, lastName: event.target.value })
                  }
                />
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={editForm.unsubscribed}
                onChange={(event) =>
                  setEditForm({ ...editForm, unsubscribed: event.target.checked })
                }
              />
              Do not send marketing emails to this person
            </label>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Modal>
      ) : null}

      {addTo ? (
        <Modal title="Add to an audience" onClose={() => setAddTo(null)}>
          <p className="hint">{addTo.email} will start receiving campaigns sent to this list.</p>
          <form className="form-grid" onSubmit={addContactToAudience}>
            <div className="field">
              <label htmlFor="addSegment">Audience</label>
              <select
                id="addSegment"
                required
                value={segmentId}
                onChange={(event) => setSegmentId(event.target.value)}
              >
                <option value="">Choose an audience</option>
                {audiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" disabled={saving}>
              {saving ? 'Adding…' : 'Add to audience'}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
