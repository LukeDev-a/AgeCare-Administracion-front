import type { AuditEntry } from '../../api/audit';
import { auditAction, auditModule, auditRecord, formatAuditDate } from '../../lib/auditMeta';

export function AuditTable({ items, loading, onSelect }: { items: AuditEntry[]; loading: boolean; onSelect: (entry: AuditEntry) => void }) {
  return <div className="audit-table-scroll" aria-busy={loading}><table className="data"><thead><tr>{['Fecha', 'Usuario', 'Acción', 'Módulo', 'Registro', 'Detalle'].map(title => <th key={title}>{title}</th>)}</tr></thead>
    <tbody>{loading ? <tr><td colSpan={6}>Cargando actividad…</td></tr> : !items.length ? <tr><td colSpan={6}>No hay eventos para mostrar.</td></tr> : items.map(entry => <tr key={entry.id}>
      <td style={{ whiteSpace: 'nowrap' }}>{formatAuditDate(entry.created_at)}</td>
      <td><strong>{entry.actor.name || 'Sin autenticación'}</strong><div className="card-sub">{entry.actor.role}</div></td>
      <td>{auditAction(entry)}</td>
      <td>{auditModule(entry)}</td>
      <td>{auditRecord(entry)}</td>
      <td><button type="button" className="action-button" onClick={() => onSelect(entry)}>Ver</button></td>
    </tr>)}</tbody></table></div>;
}
