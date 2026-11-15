'use client';

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { formatDate, fullName } from '../lib/format';
import type { Audience, Contact } from '../lib/types';
import { EmptyState } from './EmptyState';
import { IconPlus, IconSearch } from './Icons';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { useToast } from './Toast';

export function AudiencesView() {
  const { notify } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [query, setQuery] = useState(params.get('q') || '');
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Audience | null>(null);
  const [members, setMembers] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editName, setEditName] = useState('');
  const [addContactId, setAddContactId] = useState('');
  const [newEmail, setNewEmail] = useState({ email: '', firstName: '', lastName: '' });
  const [editing, setEditing] = useState<Contact | null>(null);
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    unsubscribed: false,
  });
  const [focus, setFocus] = useState<'add' | 'edit' | null>(null);
  const [dragId, setDragId] = useState('');
  const [over, setOver] = useState<'in' | 'out' | ''>('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const result = await api<{ data: Audience[] }>('/api/segments');
      setAudiences(result.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audiences');
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setQuery(params.get('q') || '');
    if (params.get('new') === '1') setOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return audiences;
    return audiences.filter((audience) => audience.name.toLowerCase().includes(needle));
  }, [audiences, query]);

  async function createAudience(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/segments', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      notify('Audience created');
      setName('');
      setOpen(false);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not create audience');
    } finally {
      setSaving(false);
    }
  }

  const available = useMemo(
    () => contacts.filter((contact) => !members.some((member) => member.id === contact.id)),
    [contacts, members],
  );

  useEffect(() => {
    if (!selected) return;
    if (focus === 'edit') nameRef.current?.focus();
    if (focus === 'add') emailRef.current?.focus();
  }, [selected, focus]);

  async function openAudience(audience: Audience, nextFocus: 'add' | 'edit' | null = null) {
    setSelected(audience);
    setEditName(audience.name);
    setEditing(null);
    setAddContactId('');
    setNewEmail({ email: '', firstName: '', lastName: '' });
    setFocus(nextFocus);
    try {
      const [memberList, contactList] = await Promise.all([
        api<{ data: Contact[] }>(`/api/segments/${audience.id}/contacts`),
        api<{ data: Contact[] }>('/api/contacts'),
      ]);
      setMembers(memberList.data);
      setContacts(contactList.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load audience');
    }
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api(`/api/segments/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName }),
      });
      const next = { ...selected, name: editName.trim() };
      setSelected(next);
      setAudiences((current) =>
        current.map((audience) => (audience.id === next.id ? next : audience)),
      );
      notify('Audience updated');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update audience');
    } finally {
      setSaving(false);
    }
  }

  async function addNewEmail(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const email = newEmail.email.trim();
    if (!email) return;
    const existing = contacts.find(
      (contact) => contact.email.toLowerCase() === email.toLowerCase(),
    );
    if (existing && members.some((member) => member.id === existing.id)) {
      notify('That email is already on this list');
      return;
    }
    setAdding(true);
    try {
      if (existing) {
        await api(`/api/contacts/${existing.id}/segments`, {
          method: 'POST',
          body: JSON.stringify({ segmentId: selected.id }),
        });
      } else {
        await api('/api/contacts', {
          method: 'POST',
          body: JSON.stringify({
            email,
            firstName: newEmail.firstName.trim(),
            lastName: newEmail.lastName.trim(),
            segmentId: selected.id,
          }),
        });
      }
      notify('Email added to the audience');
      setNewEmail({ email: '', firstName: '', lastName: '' });
      const [memberList, contactList] = await Promise.all([
        api<{ data: Contact[] }>(`/api/segments/${selected.id}/contacts`),
        api<{ data: Contact[] }>('/api/contacts'),
      ]);
      setMembers(memberList.data);
      setContacts(contactList.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add email');
    } finally {
      setAdding(false);
    }
  }

  async function addPerson(contactId: string) {
    if (!selected || !contactId || members.some((member) => member.id === contactId)) return;
    setSaving(true);
    try {
      await api(`/api/contacts/${contactId}/segments`, {
        method: 'POST',
        body: JSON.stringify({ segmentId: selected.id }),
      });
      notify('Contact added to the audience');
      setAddContactId('');
      const memberList = await api<{ data: Contact[] }>(
        `/api/segments/${selected.id}/contacts`,
      );
      setMembers(memberList.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add contact');
    } finally {
      setSaving(false);
    }
  }

  function startDrag(event: DragEvent<HTMLElement>, contactId: string) {
    setDragId(contactId);
    event.dataTransfer.setData('text/plain', contactId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function allowDrop(event: DragEvent<HTMLElement>, zone: 'in' | 'out') {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(zone);
  }

  async function dropOn(event: DragEvent<HTMLElement>, zone: 'in' | 'out') {
    event.preventDefault();
    const contactId = event.dataTransfer.getData('text/plain') || dragId;
    setOver('');
    setDragId('');
    if (!contactId) return;
    if (zone === 'in') await addPerson(contactId);
    if (zone === 'out' && members.some((member) => member.id === contactId)) {
      const contact = members.find((member) => member.id === contactId);
      if (contact) await removePerson(contact);
    }
  }

  async function removePerson(contact: Contact) {
    if (!selected) return;
    setSaving(true);
    try {
      await api(
        `/api/contacts/${contact.id}/segments?segmentId=${encodeURIComponent(selected.id)}`,
        { method: 'DELETE' },
      );
      setMembers((current) => current.filter((member) => member.id !== contact.id));
      notify('Removed from the audience');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not remove contact');
    } finally {
      setSaving(false);
    }
  }

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/api/contacts/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(memberForm),
      });
      setMembers((current) =>
        current.map((member) =>
          member.id === editing.id ? { ...member, ...memberForm } : member,
        ),
      );
      setEditing(null);
      notify('Contact updated');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Audiences"
        description="An audience is a mailing list. When you schedule a campaign, everyone in the chosen audience receives it."
        actions={
          <button className="btn" type="button" onClick={() => setOpen(true)}>
            <IconPlus /> Create audience
          </button>
        }
      />
      {error ? <p className="warning">{error}</p> : null}
      {audiences.length > 0 ? (
        <div className="filter-bar">
          <div className="search">
            <IconSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search audiences"
              aria-label="Search audiences"
            />
          </div>
        </div>
      ) : null}
      {audiences.length === 0 ? (
        <div className="table-wrap">
          <EmptyState
            title="Create your first list"
            description="Start with something simple like Newsletter, Customers, or Launch waitlist."
            action={
              <button className="btn" type="button" onClick={() => setOpen(true)}>
                Create audience
              </button>
            }
          />
        </div>
      ) : (
        <div className="cards">
          {filtered.map((audience) => (
            <article className="audience-card" key={audience.id}>
              <button
                className="audience-main"
                type="button"
                onClick={() => openAudience(audience)}
              >
                <h4>{audience.name}</h4>
                <p className="muted">Created {formatDate(audience.createdAt)}</p>
                <p className="hint">Open to see who is on this list</p>
              </button>
              <div className="actions">
                <button
                  className="btn secondary small"
                  type="button"
                  onClick={() => openAudience(audience, 'add')}
                >
                  Add
                </button>
                <button
                  className="btn secondary small"
                  type="button"
                  onClick={() => openAudience(audience, 'edit')}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {audiences.length > 0 && filtered.length === 0 ? (
        <p className="muted">No audiences match this search.</p>
      ) : null}

      {open ? (
        <Modal
          title="Create an audience"
          onClose={() => {
            setOpen(false);
            if (params.get('new')) {
              const next = query ? `/audiences?q=${encodeURIComponent(query)}` : '/audiences';
              router.replace(next);
            }
          }}
        >
          <form className="form-grid" onSubmit={createAudience}>
            <div className="field">
              <label htmlFor="audienceName">List name</label>
              <input
                id="audienceName"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Newsletter, Launch list, Customers"
              />
            </div>
            <button className="btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create audience'}
            </button>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal
          title={selected.name}
          wide
          onClose={() => {
            setSelected(null);
            setMembers([]);
            setEditing(null);
            setFocus(null);
            setNewEmail({ email: '', firstName: '', lastName: '' });
          }}
        >
          <form className="form-grid" onSubmit={saveName}>
            <div className="field">
              <label htmlFor="editAudienceName">List name</label>
              <input
                id="editAudienceName"
                ref={nameRef}
                required
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <button className="btn secondary" disabled={saving}>
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </form>
          <form className="form-grid add-email" onSubmit={addNewEmail}>
            <h3>Add a new email</h3>
            <p className="hint">
              Creates the contact and puts them on this list. An address that already exists is added here.
            </p>
            <div className="field">
              <label htmlFor="newEmail">Email</label>
              <input
                id="newEmail"
                ref={emailRef}
                type="email"
                required
                placeholder="alex@company.com"
                value={newEmail.email}
                onChange={(event) => setNewEmail({ ...newEmail, email: event.target.value })}
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label htmlFor="newFirst">First name</label>
                <input
                  id="newFirst"
                  value={newEmail.firstName}
                  onChange={(event) =>
                    setNewEmail({ ...newEmail, firstName: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="newLast">Last name</label>
                <input
                  id="newLast"
                  value={newEmail.lastName}
                  onChange={(event) =>
                    setNewEmail({ ...newEmail, lastName: event.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn" disabled={adding}>
              {adding ? 'Adding…' : 'Add email'}
            </button>
          </form>
          <p className="hint">Or drag someone who is already a contact onto the list.</p>
          <div className="drop-board" ref={boardRef} tabIndex={-1}>
            <section
              className={over === 'out' ? 'drop-col over' : 'drop-col'}
              onDragOver={(event) => allowDrop(event, 'out')}
              onDragLeave={() => setOver('')}
              onDrop={(event) => dropOn(event, 'out')}
            >
              <h3>Not on this list</h3>
              {available.length === 0 ? (
                <p className="hint">Everyone is already on this list.</p>
              ) : (
                available.map((contact) => (
                  <div
                    className="drag-card"
                    key={contact.id}
                    draggable={!saving}
                    onDragStart={(event) => startDrag(event, contact.id)}
                    onDragEnd={() => setDragId('')}
                  >
                    <div>
                      <strong>{fullName(contact.firstName, contact.lastName)}</strong>
                      <span className="sub">{contact.email}</span>
                    </div>
                    <button
                      className="btn secondary small"
                      type="button"
                      disabled={saving}
                      onClick={() => addPerson(contact.id)}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </section>
            <section
              className={over === 'in' ? 'drop-col over' : 'drop-col'}
              onDragOver={(event) => allowDrop(event, 'in')}
              onDragLeave={() => setOver('')}
              onDrop={(event) => dropOn(event, 'in')}
            >
              <h3>On this list</h3>
              {members.length === 0 ? (
                <p className="hint">Drop someone here.</p>
              ) : (
                members.map((contact) => (
                  <div
                    className="drag-card"
                    key={contact.id}
                    draggable={!saving}
                    onDragStart={(event) => startDrag(event, contact.id)}
                    onDragEnd={() => setDragId('')}
                  >
                    <div>
                      <strong>{fullName(contact.firstName, contact.lastName)}</strong>
                      <span className="sub">{contact.email}</span>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn secondary small"
                        type="button"
                        onClick={() => {
                          setEditing(contact);
                          setMemberForm({
                            firstName: contact.firstName,
                            lastName: contact.lastName,
                            unsubscribed: contact.unsubscribed,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger small"
                        type="button"
                        disabled={saving}
                        onClick={() => removePerson(contact)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
          {editing ? (
            <form className="form-grid" onSubmit={saveMember}>
              <p className="hint">{editing.email}</p>
              <div className="two-col">
                <div className="field">
                  <label htmlFor="memberFirst">First name</label>
                  <input
                    id="memberFirst"
                    value={memberForm.firstName}
                    onChange={(event) =>
                      setMemberForm({ ...memberForm, firstName: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="memberLast">Last name</label>
                  <input
                    id="memberLast"
                    value={memberForm.lastName}
                    onChange={(event) =>
                      setMemberForm({ ...memberForm, lastName: event.target.value })
                    }
                  />
                </div>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={memberForm.unsubscribed}
                  onChange={(event) =>
                    setMemberForm({ ...memberForm, unsubscribed: event.target.checked })
                  }
                />
                Do not send marketing emails to this person
              </label>
              <div className="actions">
                <button className="btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save contact'}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
