import { useState, type FormEvent } from 'react';
import { createContent } from '../../api/content';
import { contentStyles as ui } from './contentStyles';
import { Modal } from '../../components/Modal';

interface NewContentFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function NewContentForm({ onCreated, onCancel }: NewContentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const tags = String(data.get('tags') ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
    setIsSubmitting(true);
    setError('');
    try {
      await createContent({
        type: String(data.get('type') ?? 'news'),
        title: String(data.get('title') ?? ''),
        body: String(data.get('body') ?? ''),
        tags,
      });
      form.reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el contenido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Crear contenido" onClose={onCancel} dirty={dirty} busy={isSubmitting}>
    <form className={`${ui.form} tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5`} onChange={() => setDirty(true)} onSubmit={event => void handleSubmit(event)}>
      <div className="tw:col-span-full"><h3 className={ui.heading}>Crear contenido manualmente</h3><p className={ui.description}>Guarda el texto para revisarlo y continuar después con aprobación, audio y publicación.</p></div>
      <label>
        Tipo
        <select name="type" defaultValue="news">
          <option value="news">Noticias</option>
          <option value="joke">Chistes</option>
        </select>
      </label>
      <label>
        Título
        <input name="title" minLength={3} maxLength={160} required />
      </label>
      <label className="tw:col-span-full">
        Contenido
        <textarea name="body" rows={7} minLength={10} maxLength={4000} required />
      </label>
      <label>
        Etiquetas
        <input name="tags" placeholder="salud, familia" />
      </label>
      <div className="tw:col-span-full tw:space-y-5">
        <p className="tw:text-sm tw:text-muted">Primero guarda el borrador. Después podrás aprobar el texto, generar el audio y elegir una fecha de publicación.</p>
        {error && <p role="alert" className={ui.error}>{error}</p>}
        <div className={`${ui.actions} tw:justify-end`}>
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar borrador'}
        </button></div>
      </div>
    </form></Modal>
  );
}
