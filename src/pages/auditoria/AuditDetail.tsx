import type { AuditEntry } from '../../api/audit';
import { auditAction, auditModule, auditReason, auditRecord, formatAuditDate } from '../../lib/auditMeta';
import { Modal } from '../../components/Modal';
import { auditStyles as s, auditRole } from './auditStyles';

const LABELS: Record<string, string> = { title: 'Título', name: 'Nombre', full_name: 'Nombre completo', subject: 'Asunto', description: 'Descripción', body: 'Contenido', status: 'Estado', is_active: 'Activo', featured: 'Destacado', category: 'Categoría', min_tier: 'Plan mínimo', item_type: 'Tipo', target_url: 'Dirección del juego', external_url: 'Enlace del proveedor', price_clp: 'Precio en CLP', vendor: 'Proveedor', role: 'Rol', email: 'Correo', slug: 'Identificador del recurso', value: 'Valor', version: 'Versión', change_note: 'Justificación del cambio', reason: 'Motivo', note: 'Nota', decision_note: 'Nota de revisión', publish_at: 'Publicación programada', assigned_to: 'Responsable asignado', internal: 'Nota interna', priority: 'Prioridad' };
function Value({ value }: { value: unknown }) {
  if (value === null) return <span className="tw:text-muted">Sin valor</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>;
  if (Array.isArray(value)) return value.length ? <ul className="tw:list-disc tw:space-y-2 tw:pl-5">{value.map((v, i) => <li key={i}><Value value={v} /></li>)}</ul> : <span>Lista vacía</span>;
  if (typeof value === 'object' && value) return <dl className="tw:space-y-4">{Object.entries(value).map(([key, v]) => <div key={key}><dt className={s.muted}>{LABELS[key] ?? key.replaceAll('_', ' ')}</dt><dd className="tw:mt-1"><Value value={v} /></dd></div>)}</dl>;
  return <span className="tw:whitespace-pre-wrap tw:break-words">{value === '' ? 'Texto vacío' : String(value)}</span>;
}
export function AuditDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const changed = Array.from(new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])).filter(key => JSON.stringify(entry.before?.[key]) !== JSON.stringify(entry.after?.[key]));
  const technical = { 'ID del evento': entry.id, 'ID del usuario': entry.actor.admin_id || 'Sin identificador', 'Código del rol': entry.actor.role || 'Sin rol registrado', 'ID registro': entry.entity_id || 'Sin identificador', IP: entry.ip || 'No registrada', Navegador: entry.user_agent || 'No registrado', 'Página consultada': entry.metadata.page?.toString() || 'No corresponde' };
  return <Modal title="Detalle del evento" onClose={onClose}>
    <div className="tw:space-y-6">
      <header><p className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-brand-ink">{auditModule(entry)}</p><h3 className={s.heading}>{auditAction(entry)}</h3><p className={`tw:mt-2 ${s.muted}`}>{formatAuditDate(entry.created_at)} · Hora local del dispositivo</p></header>
      <dl className="tw:grid tw:gap-5 tw:rounded-xl tw:bg-canvas tw:p-5 tw:sm:grid-cols-2"><div><dt className={s.muted}>Responsable</dt><dd className="tw:mt-1 tw:font-semibold">{entry.actor.name || 'Usuario no identificado'}</dd><dd className={`tw:mt-1 ${s.muted}`}>{auditRole(entry.actor.role)}</dd></div><div><dt className={s.muted}>Registro relacionado</dt><dd className="tw:mt-1 tw:break-words tw:font-semibold">{auditRecord(entry) === entry.entity_id ? 'Registro sin nombre' : auditRecord(entry)}</dd></div>
        {entry.metadata.outcome && <div><dt className={s.muted}>Resultado</dt><dd className={`tw:mt-1 tw:font-semibold ${entry.metadata.outcome === 'success' ? 'tw:text-positive' : 'tw:text-warning'}`}>{entry.metadata.outcome === 'success' ? 'Correcto' : entry.metadata.outcome === 'failure' ? 'Rechazado' : entry.metadata.outcome}</dd></div>}
        {entry.metadata.reason && <div><dt className={s.muted}>Motivo</dt><dd className="tw:mt-1">{auditReason(entry.metadata.reason)}</dd></div>}
      </dl>
      <section><h3 className="tw:mb-3 tw:font-bold">Valores registrados</h3><p className={`tw:mb-5 ${s.muted}`}>Compara la información anterior y posterior al evento. Algunos accesos o consultas no incluyen cambios de valores.</p>
        <div className="tw:grid tw:gap-5 tw:lg:grid-cols-2">{[{ title: 'Antes del evento', value: entry.before }, { title: 'Después del evento', value: entry.after }].map(snapshot => <section key={snapshot.title} className={s.section}><h4 className="tw:font-bold">{snapshot.title}</h4>{snapshot.value && Object.keys(snapshot.value).length ? <dl className="tw:space-y-5">{Object.entries(snapshot.value).map(([key, value]) => <div key={key} className="tw:min-w-0"><dt className={`tw:mb-2 ${s.muted}`}>{LABELS[key] ?? key.replaceAll('_', ' ')}{changed.includes(key) && <span className="tw:ml-2 tw:text-xs tw:text-brand-ink">Valor diferente</span>}</dt><dd className="tw:rounded-lg tw:bg-canvas tw:p-3 tw:leading-relaxed tw:[overflow-wrap:anywhere]"><Value value={value} /></dd></div>)}</dl> : <p className={s.muted}>Sin valores registrados para este momento.</p>}</section>)}</div>
      </section>
      <details className={s.section}><summary className="tw:cursor-pointer tw:font-semibold">Información técnica del evento</summary><dl className="tw:grid tw:gap-5 tw:sm:grid-cols-2">{Object.entries(technical).map(([label, value]) => <div key={label}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:break-all">{value}</dd></div>)}</dl></details>
    </div>
  </Modal>;
}
