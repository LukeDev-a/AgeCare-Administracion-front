import { useEffect, useState, type FormEvent } from 'react';
import { changeContentPublication, contentAction, fetchContentAudio, deleteContent, updateContent, type ContentItem } from '../../api/content';
import { useAuth } from '../../auth/AuthContext';
import { CONTENT_STATUS_META, CONTENT_TYPES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';

interface ContentDetailProps {
  item: ContentItem;
  onChanged: () => void;
  onDeleted: () => void;
}

export function ContentDetail({ item, onChanged, onDeleted }: ContentDetailProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [body, setBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduled, setScheduled] = useState(item.publish_at ? localDate(item.publish_at) : '');
  const [audio, setAudio] = useState('');
  const [error, setError] = useState('');
  const busy = isSaving || isPublishing || isDeleting;
  const dirty = title !== item.title || body !== item.body || tags !== item.tags.join(', ') || scheduled !== (item.publish_at ? localDate(item.publish_at) : '');
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await updateContent(item.id, {
        title,
        body,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        publish_at: scheduled ? new Date(scheduled).toISOString() : null,
      });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible guardar el contenido.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePublish() {
    setIsPublishing(true);
    try {
      await changeContentPublication(item.id, item.status === 'published');
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este contenido?')) return;
    setIsDeleting(true);
    try {
      await deleteContent(item.id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible eliminar el contenido.');
      setIsDeleting(false);
    }
  }

  const status = CONTENT_STATUS_META[item.status] ?? CONTENT_STATUS_META.draft;

  return (
    <div className="card content-detail">
      <div className="card-head">
        <div>
          <div className="card-title">{item.title}</div>
          <div className="card-sub">{CONTENT_TYPES[item.type] ?? item.type} · actualizado {ticketDate(item.updated_at)}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      <form className="ticket-form" onSubmit={event => void handleSave(event)}>
        {item.provenance && <div className="wide"><p>Fuente: {item.provenance.source} · {item.provenance.author || 'Autor sin identificar'}</p>
          <a href={item.provenance.url} target="_blank" rel="noreferrer">Leer original</a>
          {item.provenance.license_url && <p><a href={item.provenance.license_url} target="_blank" rel="noreferrer">{item.provenance.license}</a> · {item.provenance.changes}</p>}</div>}
        <label>
          Título
          <input value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={160} required />
        </label>
        <label>
          Etiquetas
          <input value={tags} onChange={event => setTags(event.target.value)} />
        </label>
        <label className="wide">
          Contenido
          <textarea value={body} onChange={event => setBody(event.target.value)} minLength={10} maxLength={4000} required />
        </label>
        <div className="ticket-form-actions">
          <label>Programar publicación (hora local)<input type="datetime-local" value={scheduled} disabled={busy} onChange={event => setScheduled(event.target.value)} /></label>
          <button className="action-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="action-button" type="button" disabled={busy || dirty || (item.status !== 'published' && (!item.audio_available || item.approved_version !== item.text_version))} onClick={() => void handleTogglePublish()}>
            {isPublishing ? 'Actualizando...' : item.status === 'published' ? 'Retirar' : 'Publicar'}
          </button>
          {user?.role === 'admin' && <button className="action-button" type="button" disabled={busy || item.status === 'published'} onClick={() => void handleDelete()}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>}
          <button className="action-button" type="button" disabled={busy || dirty || item.approved_version === item.text_version} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'approve', item.text_version); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo aprobar.'); } finally { setIsSaving(false); }
          }}>Aprobar texto y generar audio</button>
          <button className="theme-toggle" type="button" disabled={busy || dirty || item.approved_version !== item.text_version || ['queued', 'waiting_quota'].includes(item.audio_status)} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'audio/retry'); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo solicitar audio.'); } finally { setIsSaving(false); }
          }}>Reintentar audio</button>
          {item.audio_available && <button className="theme-toggle" type="button" onClick={async () => {
            try { setAudio(URL.createObjectURL(await fetchContentAudio(item.id))); } catch (exception) { setError(exception instanceof Error ? exception.message : 'Audio no disponible.'); }
          }}>Escuchar audio vigente</button>}
        </div>
        <p className="card-sub wide">La edición del texto requiere nueva aprobación e invalida el audio anterior. La publicación programada espera aprobación y audio.</p>
        {item.audio_error && <p className="audit-error wide">{CONTENT_ERRORS[item.audio_error] || 'El audio requiere revisión'}. El contenido se conserva.</p>}
        {error && <p className="audit-error wide" role="alert">{error}</p>}
        {audio && <audio className="wide" controls src={audio} />}
      </form>
    </div>
  );
}

function localDate(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
