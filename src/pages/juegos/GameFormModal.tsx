import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { canManageGames } from '../../lib/gamesMeta';
import { createGameApp, updateGameApp, type GameAppItem, type GameAppPayload, type GameAppTier, type GameAppType } from '../../api/gamesApps';

const EMPTY_FORM: GameAppPayload = {
  title: '',
  slug: '',
  description: '',
  item_type: 'game',
  category: 'Estimulación cognitiva',
  min_tier: 'gratuito',
  is_active: false,
  featured: false,
  target_url: '',
};

interface GameFormModalProps {
  editingItem: GameAppItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function GameFormModal({ editingItem, onClose, onSaved }: GameFormModalProps) {
  const { user } = useAuth();
  const canManage = canManageGames(user?.role);
  const [form, setForm] = useState<GameAppPayload>(() => editingItem ? {
    ...editingItem, description: editingItem.description ?? '', target_url: editingItem.target_url ?? '',
  } : EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editUrl, setEditUrl] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const changes: Partial<GameAppPayload> = {};
        for (const key of ['title', 'description', 'item_type', 'category', 'min_tier', 'featured', 'target_url'] as const) {
          const value = form[key];
          if (value !== (editingItem[key] ?? '')) Object.assign(changes, { [key]: value });
        }
        if (Object.keys(changes).length) await updateGameApp(editingItem.id, changes);
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

  if (!canManage) return null;

  return (
    <div className="modal-backdrop">
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
              minLength={2} maxLength={150}
            />
          </label>
          <label>
            Slug identificador
            <input
              value={form.slug}
              onChange={event => {
                const slug = event.target.value.toLowerCase().replace(/\s+/g, '-');
                setForm({ ...form, slug, target_url: editUrl ? form.target_url : `/static/juegos/${slug}/index.html` });
              }}
              placeholder="ej. memoria-pro"
              disabled={!!editingItem}
              required
              minLength={2} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </label>
          <label className="wide">
            Descripción
            <textarea
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              placeholder="Breve resumen del objetivo cognitivo o funcional..."
              maxLength={4000}
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
            <input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required minLength={1} maxLength={80} />
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
            <span><input type="checkbox" checked={editUrl} disabled={isSubmitting} onChange={event => {
              setEditUrl(event.target.checked);
              if (!event.target.checked) setForm({ ...form, target_url: editingItem?.target_url ?? `/static/juegos/${form.slug}/index.html` });
            }} /> Modificar dirección del juego</span>
          </label>
          <label className="wide">
            URL de destino / ejecución
            <input
              type="text"
              value={form.target_url}
              onChange={event => setForm({ ...form, target_url: event.target.value })}
              placeholder="/static/juegos/identificador/index.html"
              required maxLength={500}
              disabled={!editUrl || isSubmitting}
            />
          </label>
          {(editUrl || editingItem?.resource_kind === 'external') && <p role="note" className="mini-note wide">Los juegos de otras webs deben usar HTTPS. Al desactivarlos, se retiran de nuestro catálogo; AgeCare no puede bloquear su enlace externo ni detener las partidas abiertas en esa web.</p>}
          <p className="mini-note wide">{editingItem ? 'La edición conserva el estado actual.' : 'El juego se creará inactivo; podrás activarlo después desde el catálogo.'} Desmarcar «Modificar dirección del juego» descarta los cambios de dirección.</p>
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
