import type { GameAppItem } from '../../api/gamesApps';
import { GAME_TIER_LABELS, GAME_TYPE_LABELS } from '../../lib/gamesMeta';
import { gameStyles as s } from './gameStyles';

interface GamesTableProps {
  canManage: boolean;
  items: GameAppItem[];
  busy?: boolean;
  onToggle: (item: GameAppItem) => void;
  onEdit: (item: GameAppItem) => void;
  onDelete: (item: GameAppItem) => void;
  onInspect: (item: GameAppItem) => void;
}

export function GamesTable({ items, canManage, busy = false, onToggle, onEdit, onDelete, onInspect }: GamesTableProps) {
  if (items.length === 0) return <div className="tw:py-14 tw:text-center">
    <p className="tw:text-lg tw:font-semibold">No hay resultados para esta consulta</p>
    <p className={`tw:mt-2 ${s.muted}`}>Prueba otro nombre o cambia los filtros.</p>
  </div>;

  return <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke">
    <table className="tw:w-full tw:min-w-[860px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_th]:font-semibold tw:[&_td]:border-x-0 tw:[&_td]:border-b-0 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:align-middle">
      <thead><tr><th>Juego o aplicación</th><th>Categoría</th><th>Plan mínimo</th><th>Estado</th><th>Información</th>{canManage && <th>Acciones</th>}</tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className="tw:hover:bg-canvas/50">
        <td className="tw:max-w-72">
          <p className="tw:font-semibold tw:leading-relaxed">{item.title}</p>
          <div className="tw:mt-2 tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs tw:text-muted">
            <span>{GAME_TYPE_LABELS[item.item_type] ?? item.item_type}</span>
            {item.featured && <span className="tw:text-brand-ink">★ Destacado</span>}
            {item.resource_kind === 'external' && <span>En otra web</span>}
          </div>
        </td>
        <td>{item.category}</td>
        <td>{GAME_TIER_LABELS[item.min_tier] ?? item.min_tier}</td>
        <td><span className={`${s.badge} ${item.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}><span aria-hidden="true">{item.is_active ? '●' : '○'}</span>{item.is_active ? 'Activo' : 'Inactivo'}</span></td>
        <td><button type="button" className={s.button} onClick={() => onInspect(item)} disabled={busy} aria-label={`Ver detalle de ${item.title}`}>Ver detalle</button></td>
        {canManage && <td><div className="tw:flex tw:flex-wrap tw:gap-2">
          <button type="button" className={s.button} disabled={busy} onClick={() => onEdit(item)} aria-label={`Editar ${item.title}`}>Editar</button>
          <button type="button" className={s.button} disabled={busy} onClick={() => onToggle(item)} aria-label={`${item.is_active ? 'Desactivar' : 'Activar'} ${item.title}`}>{item.is_active ? 'Desactivar' : 'Activar'}</button>
          <button type="button" className={`${s.button} tw:text-negative`} disabled={busy} onClick={() => onDelete(item)} aria-label={`Eliminar ${item.title}`}>Eliminar</button>
        </div></td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
