import type { EndUserDetail, PatientDetail } from '../../api/endUsers';
import { directoryDate, MOBILE_PROFILES } from '../../lib/endUsersMeta';

export function DirectoryDetail({ record, onSelect, onDeactivate, onClose }: {
  record: EndUserDetail | PatientDetail; onSelect: (kind: 'users' | 'patients', id: string) => void;
  onDeactivate: (user: EndUserDetail) => void; onClose: () => void;
}) {
  return <div className="tw:space-y-6 tw:rounded-2xl tw:border tw:border-solid tw:border-brand tw:bg-panel tw:p-5 tw:sm:p-7" aria-label="Detalle de usuario o paciente">
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><p className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-brand-ink">{'user_id' in record ? 'Cuenta de la app móvil' : 'Ficha del paciente'}</p><h2 className="tw:text-2xl tw:font-bold tw:break-words">{record.full_name}</h2></div>
      <button className={button} type="button" onClick={onClose}>Cerrar detalle</button></div>
    {'user_id' in record ? <>
      <dl className="tw:grid tw:gap-4 tw:sm:grid-cols-2"><div className={info}><dt>Correo de la cuenta</dt><dd className="tw:mt-2 tw:font-semibold tw:break-words">{record.email}</dd></div>
        <div className={info}><dt>Estado de la cuenta</dt><dd className="tw:mt-2 tw:font-semibold">{record.is_active ? 'Activa' : 'Inactiva'}</dd></div></dl>
      <div><h3 className="tw:text-xl tw:font-bold">Vínculos de cuidado</h3>
      <p className="tw:mt-2 tw:text-muted">El perfil corresponde a cada paciente. Una persona puede tener distintos perfiles.</p></div>
      {record.memberships.length ? <div className={scroll}><table className={table}><thead><tr><th>Paciente</th><th>Perfil</th><th>Responsable del círculo</th><th>Acción</th></tr></thead><tbody>
        {record.memberships.map(m => <tr key={m.patient_id}><td>{m.patient_name}</td><td>{MOBILE_PROFILES[m.role]}</td><td>{m.is_owner ? 'Sí' : 'No'}</td><td><button type="button" className={button} onClick={() => onSelect('patients', m.patient_id)}>Ver paciente</button></td></tr>)}
      </tbody></table></div> : <p>No tiene vínculos de cuidado registrados.</p>}
      {!record.is_active && <div className={info}><h3 className="tw:mb-3 tw:font-semibold">Desactivación registrada</h3><p>Fecha de desactivación: {directoryDate(record.deactivated_at)} · Santiago</p><p className="tw:mt-3 tw:whitespace-pre-wrap tw:break-words">Motivo: {record.deactivation_reason || 'No registrado'}</p></div>}
      {record.is_active && <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5"><div><h3 className="tw:font-semibold">Desactivar esta cuenta</h3><p className="tw:mt-2 tw:max-w-xl tw:text-muted">Se conservarán sus datos y vínculos de cuidado. Se pedirá un motivo antes de confirmar.</p></div><button className={`${button} tw:text-negative`} type="button" onClick={() => onDeactivate(record)}>Desactivar cuenta</button></div>}
    </> : <>
      <p className={info}>Una ficha de paciente no implica que exista una cuenta de acceso propia. Aquí se muestran únicamente identificación y vínculos.</p>
      <div><h3 className="tw:text-xl tw:font-bold">Círculo de cuidado</h3><p className="tw:mt-2 tw:text-muted">Personas vinculadas a este paciente y el perfil con el que participan.</p></div>
      {record.members.length ? <div className={scroll}><table className={table}><thead><tr><th>Persona</th><th>Correo</th><th>Perfil</th><th>Responsable</th><th>Estado de la cuenta</th><th>Acción</th></tr></thead><tbody>
        {record.members.map(m => <tr key={m.user_id}><td>{m.full_name}</td><td>{m.email}</td><td>{MOBILE_PROFILES[m.role]}</td><td>{m.is_owner ? 'Sí' : 'No'}</td><td>{m.is_active ? 'Activa' : 'Inactiva'}</td><td><button type="button" className={button} onClick={() => onSelect('users', m.user_id)}>Ver cuenta</button></td></tr>)}
      </tbody></table></div> : <p>Este paciente no tiene miembros vinculados.</p>}
    </>}
    <details className="tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm tw:text-muted"><summary className="tw:cursor-pointer tw:font-semibold">Identificador del registro</summary><p className="tw:mt-3 tw:break-all">{'user_id' in record ? record.user_id : record.patient_id}</p></details>
  </div>;
}

const info = 'tw:rounded-xl tw:bg-canvas tw:p-5 tw:leading-relaxed';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const scroll = 'tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke';
const table = 'tw:w-full tw:min-w-[640px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:leading-relaxed';
