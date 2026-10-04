import { useEffect, useState, type FormEvent } from 'react';
import { createGameApp, updateGameApp, type GameAppItem, type GameAppPayload, type GameAppTier, type GameAppType } from '../../api/gamesApps';

const EMPTY_FORM: GameAppPayload = {
  title: '',
  slug: '',
  description: '',
  item_type: 'game',
  category: 'Estimulación cognitiva',
  min_tier: 'gratuito',
  is_active: true,
  featured: false,
  target_url: '',
  icon_url: '',
};

interface GameFormModalProps {
  editingItem: GameAppItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function GameFormModal({ editingItem, onClose, onSaved }: GameFormModalProps) {
  const [form, setForm] = useState<GameAppPayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setForm({
        title: editingItem.title,
        slug: editingItem.slug,
        description: editingItem.description ?? '',
        item_type: editingItem.item_type,
        category: editingItem.category,
        min_tier: editingItem.min_tier,
        is_active: editingItem.is_active,
        featured: editingItem.featured,
        target_url: editingItem.target_url ?? '',
        icon_url: editingItem.icon_url ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingItem]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateGameApp(editingItem.id, form);
      } else {
        await createGameApp(form);
      }
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible guardar el elemento.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <div className="card-title">{editingItem ? 'Editar módulo' : 'Nuevo juego o aplicación'}</div>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Completa la información que verán los usuarios en la aplicación.
        </div>
        <form className="ticket-form" onSubmit={event => void handleSubmit(event)}>
          <label>
            Título
            <input
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              placeholder="ej. Memoria Pro"
              required
            />
          </label>
          <label>
            Slug identificador
            <input
              value={form.slug}
              onChange={event => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="ej. memoria-pro"
              disabled={!!editingItem}
              required
            />
          </label>
          <label className="wide">
            Descripción
            <textarea
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              placeholder="Breve resumen del objetivo cognitivo o funcional..."
            />
          </label>
          <label>
            Tipo
            <select value={form.item_type} onChange={event => setForm({ ...form, item_type: event.target.value as GameAppType })}>
              <option value="game">Juego</option>
              <option value="app">App</option>
            </select>
          </label>
          <label>
            Categoría
            <input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required />
          </label>
          <label>
            Plan mínimo
            <select value={form.min_tier} onChange={event => setForm({ ...form, min_tier: event.target.value as GameAppTier })}>
              <option value="gratuito">Gratuito</option>
              <option value="dorado">Dorado</option>
              <option value="platino">Platino</option>
            </select>
          </label>
          <label className="wide">
            URL de destino / ejecución
            <input
              type="url"
              value={form.target_url}
              onChange={event => setForm({ ...form, target_url: event.target.value })}
              placeholder="https://..."
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />
            Activo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} />
            Destacar en inicio
          </label>
          <div className="ticket-form-actions">
            <button className="action-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="action-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}