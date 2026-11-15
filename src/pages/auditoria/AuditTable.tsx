import type { AuditEntry } from '../../api/audit';
import { auditAction, auditModule, auditRecord, formatAuditDate } from '../../lib/auditMeta';
import { auditStyles as s, auditRole } from './auditStyles';

export function AuditTable({ items, loading, onSelect }: { items: AuditEntry[]; loading: boolean; onSelect: (entry: AuditEntry) => void }) {
  if (loading) return <p role="status" className={`${s.notice} tw:py-12 tw:text-center`}>Cargando actividad…</p>;
  if (!items.length) return <div className="tw:py-14 tw:text-center"><p className="tw:text-lg tw:font-semibold">No hay eventos para mostrar.</p><p className={`tw:mt-2 ${s.muted}`}>Prueba otro período o cambia los filtros de búsqueda.</p></div>;
  return <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><table className={s.table}>
    <thead><tr>{['Fecha y hora', 'Responsable', 'Acción realizada', 'Módulo', 'Registro', 'Detalle'].map(title => <th key={title}>{title}</th>)}</tr></thead>
    <tbody>{items.map(entry => <tr key={entry.id} className="tw:hover:bg-canvas/50">
      <td className="tw:whitespace-nowrap">{formatAuditDate(entry.created_at)}</td>
      <td><p className="tw:font-semibold">{entry.actor.name || 'Sin autenticación'}</p><p className={`tw:mt-1 ${s.muted}`}>{auditRole(entry.actor.role)}</p></td>
      <td className="tw:max-w-64 tw:leading-relaxed"><p>{auditAction(entry)}</p>{entry.metadata.outcome && <span className={`tw:mt-2 ${s.badge} ${entry.metadata.outcome === 'success' ? 'tw:text-positive' : 'tw:text-warning'}`}>{entry.metadata.outcome === 'success' ? 'Correcto' : entry.metadata.outcome === 'failure' ? 'Rechazado' : 'Resultado registrado'}</span>}</td>
      <td>{auditModule(entry)}</td><td className="tw:max-w-56 tw:break-words">{auditRecord(entry) === entry.entity_id ? 'Registro sin nombre' : auditRecord(entry)}</td>
      <td><button type="button" className={s.button} aria-label={`Ver detalle: ${auditAction(entry)} — ${entry.actor.name || 'Sin autenticación'}`} onClick={() => onSelect(entry)}>Ver detalle</button></td>
    </tr>)}</tbody>
  </table></div>;
}
