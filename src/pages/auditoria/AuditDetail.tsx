import { useEffect, useRef } from 'react';
import type { AuditEntry } from '../../api/audit';
import { auditAction, auditModule, auditRecord, formatAuditDate } from '../../lib/auditMeta';

export function AuditDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const details = { Usuario: entry.actor.name || 'Sin usuario', Rol: entry.actor.role || '—', Acción: auditAction(entry), Fecha: formatAuditDate(entry.created_at), Módulo: auditModule(entry), Registro: auditRecord(entry), 'ID registro': entry.entity_id || '—' };
  return (
    <dialog ref={dialogRef} className="audit-dialog" aria-labelledby="audit-detail-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="audit-detail">
        <div className="card-head"><div><h2 id="audit-detail-title" className="card-title">Detalle del evento</h2><div className="card-sub">{entry.id}</div></div><button autoFocus type="button" className="action-button" onClick={onClose}>Cerrar</button></div>
        <dl className="audit-detail-grid">{Object.entries(details).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="audit-detail-grid">{([{ title: 'Antes', value: entry.before }, { title: 'Después', value: entry.after }]).map(item => <div key={item.title}><h3 className="card-title">{item.title}</h3><pre className="audit-json">{item.value ? JSON.stringify(item.value, null, 2) : 'Sin datos'}</pre></div>)}</div>
      </div>
    </dialog>
  );
}
