import { useState } from 'react';
import { toggleGameAppStatus, type GameAppItem } from '../../api/gamesApps';
import { GAME_TIER_LABELS } from '../../lib/gamesMeta';
import { gameStyles as s } from './gameStyles';

interface GamesPreviewPanelProps { canManage: boolean; items: GameAppItem[]; onChanged: () => void; }

export function GamesPreviewPanel({ items, canManage, onChanged }: GamesPreviewPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => items.find(item => item.is_active)?.id ?? items[0]?.id ?? null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const [failedKey, setFailedKey] = useState('');
  const [retry, setRetry] = useState(0);
  const selected = items.find(item => item.id === selectedId) ?? items.find(item => item.is_active) ?? items[0];
  const frameKey = `${selected?.id}:${selected?.target_url}:${retry}`;

  async function handleToggle(item: GameAppItem) {
    if (!canManage || toggling) return;
    setToggling(true); setError('');
    try { await toggleGameAppStatus(item.id); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No fue posible cambiar el estado.'); }
    finally { setToggling(false); }
  }

  if (!selected) return <section className={`${s.panel} tw:py-14 tw:text-center`}><h3 className="tw:text-lg tw:font-semibold">No hay juegos para mostrar</h3><p className={`tw:mt-2 ${s.muted}`}>Cambia los filtros para encontrar un juego.</p></section>;

  return <div className="tw:grid tw:items-start tw:gap-5 tw:xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside className={s.panel} aria-label="Elegir juego para vista previa">
      <h3 className="tw:text-lg tw:font-bold">Elige un juego</h3>
      <p className={`tw:mt-2 tw:mb-4 ${s.muted}`}>Los activos se pueden probar aquí. Cambiar de juego reinicia la vista previa.</p>
      <div className="tw:grid tw:max-h-[560px] tw:gap-2 tw:overflow-y-auto tw:pr-1">
        {items.map(item => <button key={item.id} type="button" aria-pressed={selected.id === item.id} disabled={toggling} className={`${s.button} tw:w-full tw:text-left ${selected.id === item.id ? s.primary : ''}`} onClick={() => { setSelectedId(item.id); setLoadedKey(''); setFailedKey(''); setError(''); setRetry(value => value + 1); }}>
          <span className="tw:block tw:font-semibold">{item.item_type === 'game' ? '🎮' : '📱'} {item.title}</span>
          <span className={`tw:mt-1 tw:block tw:text-xs ${item.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}>{item.is_active ? '● Activo' : '○ Inactivo'} · {item.category}</span>
        </button>)}
      </div>
    </aside>
    <section className={`${s.panel} tw:min-w-0`}>
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
        <div className="tw:min-w-0"><p className="tw:mb-2 tw:text-xs tw:font-semibold tw:uppercase tw:tracking-wider tw:text-muted">Vista previa</p><h3 className={s.heading}>{selected.title}</h3><div className={`tw:mt-3 ${s.actions}`}><span className={`${s.badge} ${selected.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}>{selected.is_active ? 'Activo' : 'Inactivo'}</span><span className={s.badge}>{GAME_TIER_LABELS[selected.min_tier] ?? selected.min_tier}</span>{selected.featured && <span className={s.badge}>★ Destacado</span>}</div></div>
        {canManage && <button type="button" className={s.button} disabled={toggling} onClick={() => void handleToggle(selected)}>{toggling ? 'Actualizando…' : selected.is_active ? 'Desactivar' : 'Activar'}</button>}
      </div>
      {selected.description && <p className={`tw:mt-4 tw:whitespace-pre-wrap tw:break-words ${s.muted}`}>{selected.description}</p>}
      {error && <p role="alert" className={`tw:mt-4 ${s.error}`}>{error}</p>}
      {selected.resource_kind === 'external' && <p className={`tw:mt-4 ${s.notice}`}>Este juego está en otra web. Desactivarlo lo retira del catálogo, pero no bloquea su dirección ni detiene sus partidas. Algunas webs solo permiten abrir el juego en una pestaña nueva.</p>}
      <div className="tw:relative tw:mt-5 tw:min-h-[440px] tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:sm:min-h-[600px]" aria-busy={selected.is_active && !!selected.target_url && loadedKey !== frameKey && failedKey !== frameKey}>
        {!selected.is_active ? <div className="tw:flex tw:min-h-[440px] tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:p-8 tw:text-center"><span aria-hidden="true" className="tw:text-3xl">🎮</span><h4 className="tw:text-lg tw:font-bold">Este juego está inactivo</h4><p className={`tw:max-w-md ${s.muted}`}>{canManage ? 'Actívalo con el botón de arriba para probarlo. La activación también cambia su disponibilidad en el catálogo.' : 'Su vista previa estará disponible cuando se active.'}</p></div>
          : !selected.target_url ? <p className="tw:p-8">Este juego no tiene una dirección configurada.</p>
          : failedKey === frameKey ? <div className="tw:space-y-4 tw:p-8"><p>No se pudo cargar la vista previa. Puedes volver a intentarlo o abrir el juego en otra pestaña.</p><button type="button" className={s.button} onClick={() => setRetry(value => value + 1)}>Volver a intentar</button></div>
          : <>
            {loadedKey !== frameKey && <div role="status" className="tw:absolute tw:inset-0 tw:z-10 tw:flex tw:items-center tw:justify-center tw:gap-3 tw:bg-canvas"><span aria-hidden="true" className="tw:size-6 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Abriendo juego…</div>}
            <iframe key={frameKey} src={selected.target_url} title={`Vista previa de ${selected.title}`} className="tw:absolute tw:inset-0 tw:h-full tw:w-full tw:border-0" sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" onLoad={() => setLoadedKey(frameKey)} onError={() => setFailedKey(frameKey)} />
          </>}
      </div>
      {selected.is_active && selected.target_url && <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p className={s.muted}>Prueba los controles del juego en esta ventana.</p><a className={`${s.button} tw:inline-flex tw:items-center tw:no-underline`} href={selected.target_url} target="_blank" rel="noopener noreferrer">Abrir en pestaña nueva ↗</a></div>}
    </section>
  </div>;
}
