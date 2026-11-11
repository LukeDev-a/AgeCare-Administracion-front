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
    setDeactivating(null); setNotice('Cuenta desactivada. Se conservan sus datos y vínculos de cuidado.');
    setRevision(value => value + 1);
  }
  if (!admin) return <p role="alert">No tienes permiso para consultar usuarios y pacientes.</p>;
  const loading = list.key !== key;
  const data = loading ? undefined : list.data;
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 25));
  const record = detail.key === detailKey ? detail.record : undefined;
  return <section aria-label="Usuarios y pacientes" className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
      <div><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Directorio de la aplicación</p>
        <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Usuarios y pacientes</h1>
        <p className="tw:mt-2 tw:max-w-2xl tw:text-muted">Consulta las cuentas de la app móvil y las personas vinculadas a su cuidado.</p></div>
      <button type="button" className={button} disabled={!!deactivating} onClick={() => setRevision(value => value + 1)}>Actualizar</button>
    </header>
    <div className="tw:flex tw:flex-wrap tw:gap-2 tw:rounded-2xl tw:bg-canvas tw:p-2" role="group" aria-label="Tipo de directorio"><button type="button" className={`${button} ${kind === 'users' ? selected : ''}`} aria-pressed={kind === 'users'} disabled={!!deactivating} onClick={() => changeKind('users')}>Usuarios de la app</button>
        <button type="button" className={`${button} ${kind === 'patients' ? selected : ''}`} aria-pressed={kind === 'patients'} disabled={!!deactivating} onClick={() => changeKind('patients')}>Pacientes</button></div>
    <div className={panel}>
      <h2 className="tw:text-xl tw:font-bold">{kind === 'users' ? 'Cuentas de la app móvil' : 'Pacientes y sus círculos de cuidado'}</h2>
      <p className="tw:mt-2 tw:mb-6 tw:max-w-3xl tw:text-muted">{kind === 'users'
        ? 'Una cuenta identifica a quien accede a la app. Puede participar como familiar, cuidador, médico o adulto mayor según su vínculo con cada paciente.'
        : 'El paciente es la persona que recibe cuidados, como el adulto mayor. Su ficha reúne a quienes lo acompañan y no exige que tenga una cuenta propia.'}</p>
      <form className="tw:grid tw:items-end tw:gap-4 tw:lg:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={apply}>
        <label className={label}>{kind === 'users' ? 'Nombre o correo de la cuenta' : 'Nombre del paciente o correo de un miembro'}<input className={field} aria-label="Buscar usuarios o pacientes" placeholder={kind === 'users' ? 'Escribe un nombre o correo' : 'Escribe el nombre o correo vinculado'} maxLength={120} disabled={!!deactivating} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        {kind === 'users' && <label className={label}>Estado de la cuenta<select className={field} aria-label="Estado de la cuenta" value={stateDraft} disabled={!!deactivating} onChange={event => setStateDraft(event.target.value)}><option value="">Todas</option><option value="true">Activas</option><option value="false">Inactivas</option></select></label>}
        <div className="tw:flex tw:flex-wrap tw:gap-3"><button type="submit" className={`${button} ${selected}`} disabled={!!deactivating}>Buscar</button><button type="button" className={button} disabled={!!deactivating} onClick={() => changeKind(kind)}>Limpiar</button></div>
      </form>
    </div>
    {notice && <p role="status" className={message}>{notice}</p>}
    {!loading && list.error && <p role="alert" className={message}>{list.error}</p>}
    <div className={panel} aria-busy={loading}><h2 className="tw:mb-4 tw:text-xl tw:font-bold">Resultados de la consulta</h2>
      {filter.q && <p className="tw:mb-4 tw:text-muted">Búsqueda aplicada: <strong className="tw:text-ink">{filter.q}</strong></p>}
      {loading ? <p role="status">Cargando directorio…</p> : data && <>
      <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><table className={table}><thead><tr><th scope="col">Nombre</th>{kind === 'users' && <><th scope="col">Correo</th><th scope="col">Estado</th></>}<th scope="col">{kind === 'users' ? 'Vínculos de cuidado' : 'Miembros'}</th><th scope="col">Acción</th></tr></thead><tbody>
        {data.items.map(item => 'user_id' in item ? <tr key={item.user_id} className={selection?.id === item.user_id ? 'tw:bg-brand-soft' : ''}><td className="tw:font-semibold">{item.full_name}</td><td className="tw:break-words">{item.email}</td><td><span className={`tw:inline-block tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1 tw:font-semibold ${item.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}>{item.is_active ? 'Activa' : 'Inactiva'}</span></td><td>{item.memberships_count}</td><td><button type="button" className={button} aria-expanded={selection?.id === item.user_id} disabled={!!deactivating} onClick={() => setSelection({ kind: 'users', id: item.user_id })}>Ver detalle</button></td></tr>
          : <tr key={item.patient_id} className={selection?.id === item.patient_id ? 'tw:bg-brand-soft' : ''}><td className="tw:font-semibold">{item.full_name}</td><td>{item.members_count}</td><td><button type="button" className={button} aria-expanded={selection?.id === item.patient_id} disabled={!!deactivating} onClick={() => setSelection({ kind: 'patients', id: item.patient_id })}>Ver detalle</button></td></tr>)}
      </tbody></table></div>
      {!data.items.length && <p className={message}>No hay coincidencias con la búsqueda.</p>}
      <div className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><span className="tw:text-muted">{data.total} {kind === 'users' ? 'cuentas' : 'pacientes'}</span><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3"><button type="button" className={button} disabled={page <= 1 || !!deactivating} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className={button} disabled={page >= pages || !!deactivating} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    </>}</div>
    {selection && !record && (detail.key === detailKey && detail.error ? <p role="alert" className={message}>{detail.error}</p> : <p role="status" className={message}>Cargando detalle…</p>)}
    {record && <DirectoryDetail record={record} onSelect={(next, id) => setSelection({ kind: next, id })} onDeactivate={setDeactivating} onClose={() => setSelection(null)} />}
    {deactivating && <DeactivateDialog user={deactivating} onConfirm={confirm} onClose={() => setDeactivating(null)} />}
  </section>;
}

const panel = 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7';
const label = 'tw:grid tw:gap-2 tw:font-semibold';
const field = 'tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:text-base tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const selected = 'tw:border-brand tw:bg-brand-soft tw:text-brand-ink';
const message = 'tw:my-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5 tw:leading-relaxed';
const table = 'tw:w-full tw:min-w-[640px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_th]:font-semibold tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:leading-relaxed';
