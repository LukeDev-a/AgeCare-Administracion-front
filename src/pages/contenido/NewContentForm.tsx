import { useState, type FormEvent } from 'react';
import { createContent } from '../../api/content';

interface NewContentFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function NewContentForm({ onCreated, onCancel }: NewContentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const tags = String(data.get('tags') ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
    setIsSubmitting(true);
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
      alert(err instanceof Error ? err.message : 'No fue posible crear el contenido.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={event => void handleSubmit(event)}>
      <label>
        Tipo
        <select name="type" defaultValue="news">
          <option value="news">Noticias</option>
          <option value="joke">Consejos y humor</option>
        </select>
      </label>
      <label>
        Título
        <input name="title" minLength={3} maxLength={160} required />
      </label>
      <label className="wide">
        Contenido
        <textarea name="body" minLength={10} maxLength={4000} required />
      </label>
      <label>
        Etiquetas
        <input name="tags" placeholder="salud, familia" />
      </label>
      <div className="ticket-form-actions">
        <button className="action-button" type="button" onClick={onCancel}>Cerrar formulario</button>
        <button className="action-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar contenido'}
        </button>
      </div>
    </form>
  );
}