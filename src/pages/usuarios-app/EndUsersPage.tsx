import { useAutoFilters } from '../../hooks/useAutoFilters';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { deactivateEndUser, fetchEndUser, fetchEndUsers, fetchPatient, fetchPatients,
  type DirectoryPage, type EndUserDetail, type EndUserSummary, type PatientDetail, type PatientSummary } from '../../api/endUsers';
import { DeactivateDialog } from './DeactivateDialog';
import { DirectoryDetail } from './DirectoryDetail';
import { Modal } from '../../components/Modal';

type Kind = 'users' | 'patients';
export function EndUsersPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('users');
  const { draft, filters: filter, page, setPage, setField, reset } = useAutoFilters(
    { q: '', state: '' }, { delayedKeys: ['q'] });
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
  }, [admin, kind, filter, page, revision, key, setPage]);
  useEffect(() => {
    if (!admin || !selection) return;
    const controller = new AbortController();
    const load = selection.kind === 'users' ? fetchEndUser(selection.id, controller.signal) : fetchPatient(selection.id, controller.signal);
    load.then(record => { if (!controller.signal.aborted) setDetail({ key: detailKey, record }); })
      .catch(exception => { if (!controller.signal.aborted) setDetail({ key: detailKey, error: exception instanceof Error ? exception.message : 'No se pudo cargar el detalle.' }); });
    return () => controller.abort();
  }, [admin, selection, revision, detailKey]);
  function changeKind(next: Kind) {
    setKind(next); reset(); setSelection(null); setNotice('');
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
        <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Cuentas y adultos mayores</h1>
        <p className="tw:mt-2 tw:max-w-2xl tw:text-muted">Identifica quién accede a la aplicación, quién recibe cuidados y qué relación tienen.</p></div>
      <button type="button" className={button} disabled={!!deactivating} onClick={() => setRevision(value => value + 1)}>Actualizar</button>
    </header>
    <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2" role="group" aria-label="Tipo de directorio">
      <button type="button" className={`${kindBase} ${kind === 'users' ? kindSelected : 'kindIdle'}`} aria-pressed={kind === 'users'} disabled={!!deactivating} onClick={() => changeKind('users')}><span><span className="tw:block tw:text-base tw:font-bold">Cuentas de la aplicación</span><span className="tw:mt-1 tw:block tw:font-normal">Personas con una cuenta para acceder a la app.</span></span><span aria-hidden="true" className="tw:text-2xl tw:leading-none">›</span></button>
      <button type="button" className={`${kindBase} ${kind === 'patients' ? kindSelected : 'kindIdle'}`} aria-pressed={kind === 'patients'} disabled={!!deactivating} onClick={() => changeKind('patients')}><span><span className="tw:block tw:text-base tw:font-bold">Adultos mayores</span><span className="tw:mt-1 tw:block tw:font-normal">Personas que reciben cuidados, registradas como pacientes.</span></span><span aria-hidden="true" className="tw:text-2xl tw:leading-none">›</span></button>
    </div>
    <div className={panel}>
      <h2 className="tw:text-xl tw:font-bold">{kind === 'users' ? 'Cuentas de la aplicación' : 'Adultos mayores y sus círculos de cuidado'}</h2>
      <p className="tw:mt-2 tw:mb-6 tw:max-w-3xl tw:text-muted">{kind === 'users'
        ? 'Cada cuenta tiene un correo de acceso. Abre «Ver vínculos y roles» para consultar con qué adultos mayores se relaciona y si participa como familiar, cuidador/a, médico/a o adulto mayor. El rol puede variar en cada vínculo.'
        : 'Aquí paciente significa adulto mayor que recibe cuidados. Su ficha reúne a las personas que lo acompañan y el rol de cada una. Puede tener una cuenta propia, pero no es obligatorio.'}</p>
      <div className="tw:grid tw:items-end tw:gap-4 tw:lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className={label}>{kind === 'users' ? 'Nombre o correo de la cuenta' : 'Nombre del adulto mayor o correo de una persona vinculada'}<input className={field} aria-label="Buscar cuentas o adultos mayores" placeholder={kind === 'users' ? 'Escribe un nombre o correo' : 'Escribe el nombre o correo vinculado'} maxLength={120} disabled={!!deactivating} value={draft.q} onChange={event => { setField('q', event.target.value); setSelection(null); setNotice(''); }} /></label>
        {kind === 'users' && <label className={label}>Estado de la cuenta<select className={field} aria-label="Estado de la cuenta" value={draft.state} disabled={!!deactivating} onChange={event => { setField('state', event.target.value); setSelection(null); setNotice(''); }}><option value="">Todas</option><option value="true">Activas</option><option value="false">Inactivas</option></select></label>}
        <div className="tw:flex tw:flex-wrap tw:gap-3"><button type="button" className={button} disabled={!!deactivating} onClick={() => changeKind(kind)}>Restablecer filtros</button></div>
      </div>
    </div>
    {notice && <p role="status" className={message}>{notice}</p>}
    {!loading && list.error && <p role="alert" className={message}>{list.error}</p>}
    <div className={panel} aria-busy={loading}><h2 className="tw:mb-4 tw:text-xl tw:font-bold">Resultados de la consulta</h2>
      {filter.q && <p className="tw:mb-4 tw:text-muted">Búsqueda aplicada: <strong className="tw:text-ink">{filter.q}</strong></p>}
      {loading ? <p role="status">Cargando directorio…</p> : data && <>
      <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><table className={table}><thead><tr><th scope="col">Nombre</th>{kind === 'users' && <><th scope="col">Correo</th><th scope="col">Estado</th></>}<th scope="col">{kind === 'users' ? 'Adultos mayores vinculados' : 'Personas vinculadas'}</th><th scope="col">Acción</th></tr></thead><tbody>
        {data.items.map(item => 'user_id' in item ? <tr key={item.user_id} className={selection?.id === item.user_id ? 'tw:bg-brand-soft' : ''}><td className="tw:font-semibold">{item.full_name}</td><td className="tw:break-words">{item.email}</td><td><span className={`tw:inline-block tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1 tw:font-semibold ${item.is_active ? 'tw:text-positive' : 'tw:text-muted'}`}>{item.is_active ? 'Activa' : 'Inactiva'}</span></td><td>{item.memberships_count}</td><td><button type="button" className={button} aria-expanded={selection?.id === item.user_id} disabled={!!deactivating} onClick={() => setSelection({ kind: 'users', id: item.user_id })}>Ver vínculos y roles</button></td></tr>
          : <tr key={item.patient_id} className={selection?.id === item.patient_id ? 'tw:bg-brand-soft' : ''}><td className="tw:font-semibold">{item.full_name}</td><td>{item.members_count}</td><td><button type="button" className={button} aria-expanded={selection?.id === item.patient_id} disabled={!!deactivating} onClick={() => setSelection({ kind: 'patients', id: item.patient_id })}>Ver vínculos y roles</button></td></tr>)}
      </tbody></table></div>
      {!data.items.length && <p className={message}>No hay coincidencias con la búsqueda.</p>}
      <div className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><span className="tw:text-muted">{data.total} {kind === 'users' ? 'cuentas' : 'adultos mayores'}</span><div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3"><button type="button" className={button} disabled={page <= 1 || !!deactivating} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {pages}</span><button type="button" className={button} disabled={page >= pages || !!deactivating} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    </>}</div>
    {selection && !deactivating && <Modal title="Vínculos y roles" onClose={() => setSelection(null)}>
      {!record && (detail.key === detailKey && detail.error
        ? <div className={message}><p role="alert">{detail.error}</p><button type="button" className={button} onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>
        : <p role="status" className={message}>Cargando vínculos y roles…</p>)}
      {record && <DirectoryDetail record={record} onSelect={(next, id) => setSelection({ kind: next, id })} onDeactivate={setDeactivating} />}
    </Modal>}
    {deactivating && <DeactivateDialog user={deactivating} onConfirm={confirm} onClose={() => setDeactivating(null)} />}
  </section>;
}

const panel = 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7';
const label = 'tw:grid tw:gap-2 tw:font-semibold';
const field = 'tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:text-base tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const selected = 'tw:border-brand tw:bg-brand-soft tw:text-brand-ink';
const kindBase = 'tw:flex tw:min-h-20 tw:w-full tw:cursor-pointer tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:border-2 tw:border-solid tw:px-5 tw:py-4 tw:text-left tw:text-sm tw:shadow-sm tw:transition tw:hover:-translate-y-0.5 tw:hover:shadow-md tw:active:translate-y-0 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:disabled:hover:translate-y-0 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const kindIdle = 'tw:border-[var(--line-strong)] tw:bg-panel tw:text-ink tw:hover:border-brand';
const kindSelected = 'tw:border-brand tw:bg-brand tw:text-white tw:shadow-md';
const message = 'tw:my-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5 tw:leading-relaxed';
const table = 'tw:w-full tw:min-w-[640px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_th]:font-semibold tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:leading-relaxed';
