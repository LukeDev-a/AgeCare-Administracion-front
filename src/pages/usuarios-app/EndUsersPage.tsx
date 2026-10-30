import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { deactivateEndUser, fetchEndUser, fetchEndUsers, fetchPatient, fetchPatients,
  type DirectoryPage, type EndUserDetail, type EndUserSummary, type PatientDetail, type PatientSummary } from '../../api/endUsers';
import { DeactivateDialog } from './DeactivateDialog';
import { DirectoryDetail } from './DirectoryDetail';

type Kind = 'users' | 'patients';
export function EndUsersPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('users');
  const [draft, setDraft] = useState('');
  const [stateDraft, setStateDraft] = useState('');
  const [filter, setFilter] = useState({ q: '', state: '' });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<{ key: string; data?: DirectoryPage<EndUserSummary | PatientSummary>; error?: string }>({ key: '' });
  const [selection, setSelection] = useState<{ kind: Kind; id: string } | null>(null);
  const [detail, setDetail] = useState<{ key: string; record?: EndUserDetail | PatientDetail; error?: string }>({ key: '' });
  const [deactivating, setDeactivating] = useState<EndUserDetail | null>(null);
  const [notice, setNotice] = useState('');
  const key = JSON.stringify([kind, filter, page, revision]);
  const detailKey = JSON.stringify([selection, revision]);
  const admin = user?.role === 'admin';
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    const load = kind === 'users' ? fetchEndUsers(filter.q, filter.state, page, controller.signal) : fetchPatients(filter.q, page, controller.signal);
    load.then(data => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(data.total / 25));
      if (page > lastPage) { setPage(lastPage); return; }
      setList({ key, data });
    })
      .catch(exception => { if (!controller.signal.aborted) setList({ key, error: exception instanceof Error ? exception.message : 'No se pudo cargar el directorio.' }); });
    return () => controller.abort();
  }, [admin, kind, filter, page, revision, key]);
  useEffect(() => {
    if (!admin || !selection) return;
    const controller = new AbortController();
    const load = selection.kind === 'users' ? fetchEndUser(selection.id, controller.signal) : fetchPatient(selection.id, controller.signal);
    load.then(record => { if (!controller.signal.aborted) setDetail({ key: detailKey, record }); })
      .catch(exception => { if (!controller.signal.aborted) setDetail({ key: detailKey, error: exception instanceof Error ? exception.message : 'No se pudo cargar el detalle.' }); });
    return () => controller.abort();
  }, [admin, selection, revision, detailKey]);
  function changeKind(next: Kind) {
    setKind(next); setDraft(''); setStateDraft(''); setFilter({ q: '', state: '' }); setPage(1); setSelection(null); setNotice('');
  }
  function apply(event: FormEvent) {
    event.preventDefault(); setFilter({ q: draft.trim(), state: stateDraft }); setPage(1); setSelection(null); setNotice('');
  }
  async function confirm(reason: string) {
    if (!deactivating || !admin) return;
    await deactivateEndUser(deactivating.user_id, reason);
    setDeactivating(null); setNotice('Cuenta de prueba desactivada. Se conservan sus vínculos. No se modificaron cuentas ni sesiones móviles reales.');
    setRevision(value => value + 1);
  }
  if (!admin) return <p role="alert">No tienes permiso para consultar usuarios y pacientes.</p>;
  const loading = list.key !== key;
  const data = loading ? undefined : list.data;
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 25));
  const record = detail.key === detailKey ? detail.record : undefined;
  return <section aria-label="Usuarios y pacientes">
    <div className="card"><h2 className="card-title">Usuarios y pacientes</h2>
      <p><strong>Demostración.</strong> Este directorio contiene datos de prueba. Desactivar aquí no bloquea el acceso de usuarios reales de la app móvil; esa integración sigue pendiente.</p>
      <div className="audit-actions" role="group" aria-label="Tipo de directorio"><button type="button" className="theme-toggle" aria-pressed={kind === 'users'} disabled={!!deactivating} onClick={() => changeKind('users')}>Usuarios de la app</button>
        <button type="button" className="theme-toggle" aria-pressed={kind === 'patients'} disabled={!!deactivating} onClick={() => changeKind('patients')}>Pacientes</button>
        <button type="button" className="action-button" disabled={!!deactivating} onClick={() => setRevision(value => value + 1)}>Actualizar</button></div>
      <form className="audit-filters" onSubmit={apply}>
        <label>{kind === 'users' ? 'Nombre o correo de la cuenta' : 'Nombre del paciente o correo de un miembro'}<input aria-label="Buscar usuarios o pacientes" maxLength={120} disabled={!!deactivating} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        {kind === 'users' && <label>Estado de la cuenta de prueba<select aria-label="Estado de la cuenta de prueba" value={stateDraft} disabled={!!deactivating} onChange={event => setStateDraft(event.target.value)}><option value="">Todas</option><option value="true">Activas</option><option value="false">Inactivas</option></select></label>}
        <div className="audit-actions"><button type="submit" className="action-button" disabled={!!deactivating}>Buscar</button><button type="button" className="theme-toggle" disabled={!!deactivating} onClick={() => changeKind(kind)}>Limpiar</button></div>
      </form>
    </div>
    {notice && <p role="status" className="staff-notice">{notice}</p>}
    {!loading && list.error && <p role="alert" className="audit-error">{list.error}</p>}
    <div className="card">{loading ? <p role="status">Cargando directorio…</p> : data && <>
      <div className="audit-table-scroll"><table className="data"><thead><tr><th>Nombre</th>{kind === 'users' && <><th>Correo</th><th>Estado</th></>}<th>{kind === 'users' ? 'Vínculos de cuidado' : 'Miembros'}</th><th>Acción</th></tr></thead><tbody>
        {data.items.map(item => 'user_id' in item ? <tr key={item.user_id}><td>{item.full_name}</td><td>{item.email}</td><td>{item.is_active ? 'Activa' : 'Inactiva'}</td><td>{item.memberships_count}</td><td><button type="button" className="theme-toggle" disabled={!!deactivating} onClick={() => setSelection({ kind: 'users', id: item.user_id })}>Ver detalle</button></td></tr>
          : <tr key={item.patient_id}><td>{item.full_name}</td><td>{item.members_count}</td><td><button type="button" className="theme-toggle" disabled={!!deactivating} onClick={() => setSelection({ kind: 'patients', id: item.patient_id })}>Ver detalle</button></td></tr>)}
      </tbody></table></div>
      {!data.items.length && <p>No hay coincidencias con la búsqueda.</p>}
      <div className="audit-pagination"><span>{data.total} {kind === 'users' ? 'cuentas de prueba' : 'pacientes de prueba'}</span><div className="audit-actions"><button type="button" className="theme-toggle" disabled={page <= 1 || !!deactivating} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className="theme-toggle" disabled={page >= pages || !!deactivating} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    </>}</div>
    {selection && !record && (detail.key === detailKey && detail.error ? <p role="alert" className="audit-error">{detail.error}</p> : <p role="status">Cargando detalle…</p>)}
    {record && <DirectoryDetail record={record} onSelect={(next, id) => setSelection({ kind: next, id })} onDeactivate={setDeactivating} onClose={() => setSelection(null)} />}
    {deactivating && <DeactivateDialog user={deactivating} onConfirm={confirm} onClose={() => setDeactivating(null)} />}
  </section>;
}
