import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { canManageGames } from '../../lib/gamesMeta';
import { createGameApp, updateGameApp, type GameAppItem, type GameAppPayload, type GameAppTier, type GameAppType } from '../../api/gamesApps';
import { Modal } from '../../components/Modal';
import { gameStyles as s } from './gameStyles';

const EMPTY_FORM: GameAppPayload = {
  title: '', slug: '', description: '', item_type: 'game', category: 'Estimulación cognitiva',
  min_tier: 'gratuito', is_active: false, featured: false, target_url: '',
};

interface GameFormModalProps { editingItem: GameAppItem | null; onClose: () => void; onSaved: () => void; }

export function GameFormModal({ editingItem, onClose, onSaved }: GameFormModalProps) {
  const { user } = useAuth();
  const canManage = canManageGames(user?.role);
  const initialForm: GameAppPayload = editingItem ? { ...editingItem, description: editingItem.description ?? '', target_url: editingItem.target_url ?? '' } : EMPTY_FORM;
  const [form, setForm] = useState<GameAppPayload>(() => initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editUrl, setEditUrl] = useState(false);
  const [error, setError] = useState('');
  const dirty = (Object.keys(EMPTY_FORM) as (keyof GameAppPayload)[]).some(key => form[key] !== initialForm[key]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || isSubmitting) return;
    setIsSubmitting(true); setError('');
    try {
      if (editingItem) {
        const changes: Partial<GameAppPayload> = {};
        for (const key of ['title', 'description', 'item_type', 'category', 'min_tier', 'featured', 'target_url'] as const) {
          const value = form[key];
          if (value !== (editingItem[key] ?? '')) Object.assign(changes, { [key]: value });
        }
        if (Object.keys(changes).length) await updateGameApp(editingItem.id, changes);
      } else { await createGameApp(form); }
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible guardar el elemento.'); }
    finally { setIsSubmitting(false); }
  }

  if (!canManage) return null;
  return <Modal title={editingItem ? `Editar ${editingItem.title}` : 'Crear juego o aplicación'} onClose={onClose} dirty={dirty} busy={isSubmitting} error={error}>
    <p className={`tw:mb-6 ${s.muted}`}>Completa la ficha del catálogo. Puedes revisar el resultado desde Vista previa cuando el juego esté activo.</p>
    <form onSubmit={event => void handleSubmit(event)}>
      <fieldset disabled={isSubmitting} className="tw:min-w-0 tw:space-y-6 tw:border-0">
        <section className={s.section}>
          <div><h3 className="tw:font-bold">1. Información del catálogo</h3><p className={`tw:mt-1 ${s.muted}`}>Un nombre claro y una descripción ayudan a reconocer cada juego.</p></div>
          <div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
            <label className={s.label}>Nombre<input className={s.field} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Por ejemplo, Memorama" required minLength={2} maxLength={150} /></label>
            <label className={s.label}>Identificador interno<input className={s.field} value={form.slug} onChange={event => {
              const slug = event.target.value.toLowerCase().replace(/\s+/g, '-');
              setForm({ ...form, slug, target_url: editUrl ? form.target_url : `/static/juegos/${slug}/index.html` });
            }} placeholder="Por ejemplo, memorama" disabled={!!editingItem} required minLength={2} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /><span className={s.muted}>{editingItem ? 'Identifica el recurso y no se puede modificar.' : 'Usa minúsculas, números y guiones. Debe coincidir con la carpeta del juego.'}</span></label>
            <label className={`${s.label} tw:sm:col-span-2`}>Descripción<textarea className={`${s.field} tw:min-h-32 tw:resize-y tw:leading-relaxed`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Explica brevemente en qué consiste y cómo se juega." maxLength={4000} /><span className={s.muted}>Opcional · Hasta 4000 caracteres.</span></label>
            <label className={s.label}>Tipo<select className={s.field} value={form.item_type} onChange={event => setForm({ ...form, item_type: event.target.value as GameAppType })}><option value="game">Juego</option><option value="app">Aplicación</option></select></label>
            <label className={s.label}>Categoría<input className={s.field} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required minLength={1} maxLength={80} /></label>
          </div>
        </section>
        <section className={s.section}>
          <div><h3 className="tw:font-bold">2. Recurso del juego</h3><p className={`tw:mt-1 ${s.muted}`}>La ficha utiliza un juego que ya está alojado. Crear la ficha no sube ni genera los archivos del juego.</p></div>
          <label className="tw:flex tw:items-center tw:gap-3 tw:text-sm tw:font-semibold"><input className="tw:size-5 tw:accent-brand" type="checkbox" checked={editUrl} disabled={isSubmitting} onChange={event => {
            setEditUrl(event.target.checked);
            if (!event.target.checked) setForm({ ...form, target_url: editingItem?.target_url ?? `/static/juegos/${form.slug}/index.html` });
          }} />Modificar dirección del juego</label>
          <label className={s.label}>Dirección del juego<input className={s.field} type="text" value={form.target_url} onChange={event => setForm({ ...form, target_url: event.target.value })} placeholder="/static/juegos/identificador/index.html" required maxLength={500} disabled={!editUrl || isSubmitting} /><span className={s.muted}>Está protegida para evitar cambios accidentales. Desmarcar la casilla restaura la dirección anterior.</span></label>
          {(editUrl || editingItem?.resource_kind === 'external') && <p role="note" className={s.notice}>Los juegos de otras webs deben usar HTTPS. Al desactivarlos se retiran del catálogo; AgeCare no puede bloquear su enlace externo ni detener las partidas abiertas en esa web.</p>}
        </section>
        <section className={s.section}>
          <div><h3 className="tw:font-bold">3. Disponibilidad y presentación</h3><p className={`tw:mt-1 ${s.muted}`}>{editingItem ? 'La edición conserva el estado actual. Puedes activarlo o desactivarlo desde el catálogo.' : 'El juego se creará inactivo; podrás activarlo después desde el catálogo.'}</p></div>
          <div className="tw:grid tw:items-start tw:gap-5 tw:sm:grid-cols-2">
            <label className={s.label}>Plan mínimo<select className={s.field} value={form.min_tier} onChange={event => setForm({ ...form, min_tier: event.target.value as GameAppTier })}><option value="gratuito">Gratuito</option><option value="dorado">Dorado</option><option value="platino">Platino</option></select></label>
            <label className="tw:flex tw:items-center tw:gap-3 tw:py-3 tw:text-sm tw:font-semibold"><input className="tw:size-5 tw:accent-brand" type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} />Destacar en inicio</label>
          </div>
        </section>
        <div className="tw:flex tw:justify-end"><button className={`${s.button} ${s.primary}`} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : editingItem ? 'Guardar cambios' : 'Crear inactivo'}</button></div>
      </fieldset>
    </form>
  </Modal>;
}
