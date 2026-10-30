import type { GameAppItem } from '../../api/gamesApps';
import { GAME_TIER_LABELS, GAME_TYPE_LABELS } from '../../lib/gamesMeta';

interface GamesTableProps {
  canManage: boolean;
  items: GameAppItem[];
  onToggle: (item: GameAppItem) => void;
  onEdit: (item: GameAppItem) => void;
  onDelete: (item: GameAppItem) => void;
}

export function GamesTable({ items, canManage, onToggle, onEdit, onDelete }: GamesTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr><td colSpan={canManage ? 7 : 6}>No hay juegos ni aplicaciones registradas aún.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Título / Slug</th>
          <th>Tipo</th>
          <th>Categoría</th>
          <th>Plan mínimo</th>
          <th className="num">Destacado</th>
          <th className="num">Estado</th>
          {canManage && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{item.slug}</div>
              <details><summary>Ver información</summary>
                <p>{item.description || 'Sin descripción.'}</p>
                <p>Dirección del juego: {item.target_url || 'Sin recurso configurado'}</p>
                {item.resource_kind === 'external' && <p>Juego externo: desactivarlo lo retira del catálogo; su web sigue disponible.</p>}
                <p>Creador: {item.created_by_name || 'Sin registro histórico'}</p>
                <p>Creado: {item.created_at ? new Date(item.created_at).toLocaleString('es-CL') : 'Sin datos'}</p>
                <p>Último cambio: {item.updated_at ? new Date(item.updated_at).toLocaleString('es-CL') : 'Sin datos'}</p>
              </details>
            </td>
            <td>{GAME_TYPE_LABELS[item.item_type] ?? item.item_type}</td>
            <td>{item.category}</td>
            <td>{GAME_TIER_LABELS[item.min_tier] ?? item.min_tier}</td>
            <td className="num">{item.featured ? '★ Sí' : 'No'}</td>
            <td className="num">
              {canManage ? <button
                className={`chip ${item.is_active ? 'ok' : 'neutral'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                type="button"
                onClick={() => onToggle(item)}
              >
                {item.is_active ? 'Activo' : 'Inactivo'}
              </button> : <span className={`chip ${item.is_active ? 'ok' : 'neutral'}`}>
                {item.is_active ? 'Activo' : 'Inactivo'}
              </span>}
            </td>
            {canManage && <td>
              <button className="action-button" type="button" onClick={() => onEdit(item)} style={{ marginRight: 8 }}>
                Editar
              </button>
              <button className="action-button" type="button" onClick={() => onDelete(item)}>
                Eliminar
              </button>
            </td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
