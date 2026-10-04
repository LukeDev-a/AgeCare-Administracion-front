import { useEffect, useState, type FormEvent } from 'react';
import { EMPTY_AUDIT_FILTERS, exportAudit, fetchAudit, fetchAuditUsers, type AuditEntry, type AuditFilters } from '../../api/audit';
import { AUDIT_ACTION_OPTIONS } from '../../lib/auditMeta';
import { AuditDetail } from './AuditDetail';
import { AuditTable } from './AuditTable';

export function AuditoriaPage() {
  const [draft, setDraft] = useState<AuditFilters>({ ...EMPTY_AUDIT_FILTERS });
  const [filters, setFilters] = useState<AuditFilters>({ ...EMPTY_AUDIT_FILTERS });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAuditUsers(controller.signal).then(setUsers).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const data = await fetchAudit(filters, page, pageSize, controller.signal);
        if (!controller.signal.aborted) { setItems(data.items); setTotal(data.total); }
      } catch (exception) {
        if (!controller.signal.aborted) {
          setItems([]); setTotal(0);
          setError(exception instanceof Error ? exception.message : 'Error de conexión.');
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [filters, page, pageSize, reload]);

  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.date_from && draft.date_to) {
      const span = new Date(draft.date_to).getTime() - new Date(draft.date_from).getTime();
      if (span < 0 || span > 90 * 86400000) { setError('Elige fechas en orden y un rango de hasta 90 días.'); return; }
    }
    setPage(1); setFilters({ ...draft });
  }

  async function download() {
    setExporting(true); setError('');
    try {
      const url = URL.createObjectURL(await exportAudit(filters));
      const link = document.createElement('a');
      link.href = url; link.download = 'agecare-auditoria.csv';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No fue posible exportar.'); }
    finally { setExporting(false); }
  }
  const field = (key: keyof AuditFilters, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section aria-label="Auditoría">
    <div className="card"><div className="card-head"><div><h2 className="card-title">Historial de cambios</h2><div className="card-sub">{total.toLocaleString('es-CL')} eventos encontrados · Cambios confirmados en los datos</div></div>
      <div className="audit-actions"><button type="button" className="action-button" disabled={loading} onClick={() => setReload(value => value + 1)}>Actualizar</button><button type="button" className="action-button" disabled={loading || exporting} onClick={() => void download()}>{exporting ? 'Exportando…' : 'Exportar CSV'}</button></div></div>
      <form className="audit-filters" onSubmit={apply}>
        <label>Buscar usuario, acción o módulo<input aria-label="Buscar en auditoría" maxLength={120} value={draft.q} onChange={event => field('q', event.target.value)} placeholder="Nombre, juegos, tickets…" /></label>
        <label>Usuario<select aria-label="Usuario de auditoría" value={draft.actor_id} onChange={event => field('actor_id', event.target.value)}><option value="">Todos</option>{users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select></label>
        <label>Acción<select aria-label="Acción" value={draft.action} onChange={event => field('action', event.target.value)}><option value="">Todas</option>{AUDIT_ACTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Desde (hora local)<input type="datetime-local" aria-label="Fecha inicial" value={draft.date_from} onChange={event => field('date_from', event.target.value)} /></label>
        <label>Hasta (hora local)<input type="datetime-local" aria-label="Fecha final" value={draft.date_to} onChange={event => field('date_to', event.target.value)} /></label>
        <div className="audit-actions"><button type="submit" className="action-button">Aplicar</button><button type="button" className="action-button" onClick={() => { setDraft({ ...EMPTY_AUDIT_FILTERS }); setFilters({ ...EMPTY_AUDIT_FILTERS }); setPage(1); }}>Limpiar</button></div>
      </form>
    </div>
    {error && <p role="alert" className="audit-error">{error}</p>}
    <div className="card"><AuditTable items={items} loading={loading} onSelect={setSelected} />
      <div className="audit-pagination"><label>Eventos por página <select aria-label="Eventos por página" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
        <div className="audit-actions"><button type="button" className="action-button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className="action-button" disabled={loading || page >= pages} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    </div>
    {selected && <AuditDetail entry={selected} onClose={() => setSelected(null)} />}
  </section>;
}
