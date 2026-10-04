import { useEffect, useState, type FormEvent } from 'react';
import { changeContentPublication, deleteContent, updateContent, type ContentItem } from '../../api/content';
import { CONTENT_STATUS_META, CONTENT_TYPES } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';

interface ContentDetailProps {
  item: ContentItem;
  onChanged: () => void;
  onDeleted: () => void;
}

export function ContentDetail({ item, onChanged, onDeleted }: ContentDetailProps) {
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [body, setBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setTags(item.tags.join(', '));
    setBody(item.body);
  }, [item]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await updateContent(item.id, {
        title,
        body,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
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
          <button className="action-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="action-button" type="button" disabled={isPublishing} onClick={() => void handleTogglePublish()}>
            {isPublishing ? 'Actualizando...' : item.status === 'published' ? 'Retirar' : 'Publicar'}
          </button>
          <button className="action-button" type="button" disabled={isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </form>
    </div>
  );
}