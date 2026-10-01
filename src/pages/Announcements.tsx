import { useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState, Field } from '../components/ui';
import Modal from '../components/Modal';
import { capitalize, formatDate } from '../utils/format';
import type { Announcement, AnnouncementType } from '../types';

const TYPES: AnnouncementType[] = ['info', 'urgent', 'payment', 'holiday'];
const TYPE_COLOR: Record<AnnouncementType, string> = {
  urgent: 'var(--danger)',
  info: 'var(--primary-light)',
  holiday: 'var(--success)',
  payment: 'var(--warning)',
};
const TYPE_TONE: Record<AnnouncementType, string> = {
  urgent: 'red',
  info: 'blue',
  holiday: 'green',
  payment: 'amber',
};

function AnnouncementModal({ item, onClose }: { item: Announcement | null; onClose: () => void }) {
  const { addAnnouncement, updateAnnouncement } = useApp();
  const [form, setForm] = useState({
    title: item?.title ?? '',
    body: item?.body ?? '',
    type: item?.type ?? ('info' as AnnouncementType),
  });
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const submit = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Add a title';
    if (!form.body.trim()) e.body = 'Write a message';
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = { title: form.title.trim(), body: form.body.trim(), type: form.type };
    if (item) updateAnnouncement(item.id, clean);
    else addAnnouncement(clean);
    onClose();
  };

  return (
    <Modal
      title={item ? 'Edit announcement' : 'New announcement'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {item ? 'Save changes' : 'Post announcement'}
          </button>
        </>
      }
    >
      <Field label="Title" error={errors.title}>
        {(a) => (
          <input
            {...a}
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Announcement title"
          />
        )}
      </Field>
      <Field label="Message" error={errors.body}>
        {(a) => (
          <textarea
            {...a}
            className="form-textarea"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Write your announcement…"
          />
        )}
      </Field>
      <Field label="Type">
        {(a) => (
          <select
            {...a}
            className="form-select"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementType })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>
        )}
      </Field>
    </Modal>
  );
}

export default function Announcements() {
  const { announcements, deleteAnnouncement } = useApp();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);

  return (
    <div className="page-enter">
      <div className="filter-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Plus aria-hidden="true" /> New announcement
        </button>
      </div>
      <div className="card">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            hint="Post your first building-wide notice."
          />
        ) : (
          <div className="card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {announcements.map((a) => (
              <article key={a.id} className="ann-item">
                <span className="ann-dot" style={{ background: TYPE_COLOR[a.type] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ann-head">
                    <h2 className="ann-title">{a.title}</h2>
                    <span
                      className={`stat-badge tone-${TYPE_TONE[a.type]}`}
                      style={{ fontSize: 11, borderRadius: 20 }}
                    >
                      {capitalize(a.type)}
                    </span>
                  </div>
                  <p className="ann-body">{a.body}</p>
                  <div className="ann-meta">
                    {a.author} · {formatDate(a.date)}
                  </div>
                </div>
                <div className="ann-actions no-print">
                  <button
                    className="btn-icon"
                    onClick={() => setEditing(a)}
                    aria-label={`Edit ${a.title}`}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() =>
                      window.confirm(`Delete "${a.title}"?`) && deleteAnnouncement(a.id)
                    }
                    aria-label={`Delete ${a.title}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {editing && (
        <AnnouncementModal
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
