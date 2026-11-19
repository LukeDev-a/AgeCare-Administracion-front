import type { EndUserDetail, PatientDetail } from '../../api/endUsers';
import { directoryDate, MOBILE_PROFILES } from '../../lib/endUsersMeta';

export function DirectoryDetail({ record, onSelect, onDeactivate }: {
  record: EndUserDetail | PatientDetail; onSelect: (kind: 'users' | 'patients', id: string) => void;
  onDeactivate: (user: EndUserDetail) => void;
}) {
  return <div className="tw:space-y-6 tw:rounded-2xl tw:border tw:border-solid tw:border-brand tw:bg-panel tw:p-5 tw:sm:p-7" aria-label="Detalle de usuario o paciente">
    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div><p className="tw:mb-2 tw:text-sm tw:font-semibold tw:text-brand-ink">{'user_id' in record ? 'Cuenta de la app móvil' : 'Adulto mayor · Persona que recibe cuidados'}</p><h2 className="tw:text-2xl tw:font-bold tw:break-words">{record.full_name}</h2></div>
      </div>
    {'user_id' in record ? <>
      <dl className="tw:grid tw:gap-4 tw:sm:grid-cols-2"><div className={info}><dt>Correo de la cuenta</dt><dd className="tw:mt-2 tw:font-semibold tw:break-words">{record.email}</dd></div>
        <div className={info}><dt>Estado de la cuenta</dt><dd className="tw:mt-2 tw:font-semibold">{record.is_active ? 'Activa' : 'Inactiva'}</dd></div></dl>
      <div><h3 className="tw:text-xl tw:font-bold">Cómo participa {record.full_name}</h3>
      <p className="tw:mt-2 tw:text-muted">Los roles pertenecen a esta cuenta, según su relación con cada adulto mayor. No son permisos de la consola.</p></div>
      {record.memberships.length ? <div className="tw:space-y-3">{record.memberships.map(m => <article key={m.patient_id} className={info}>
        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div>
          <span className="tw:inline-block tw:rounded-full tw:bg-brand-soft tw:px-3 tw:py-1 tw:text-sm tw:font-semibold tw:text-brand-ink">{MOBILE_PROFILES[m.role]}</span>
          <p className="tw:mt-3">{m.role === 'elder' ? <><strong>{record.full_name}</strong> tiene una cuenta como adulto mayor. Ficha vinculada: <strong>{m.patient_name}</strong>.</> : <><strong>{record.full_name}</strong> participa como {MOBILE_PROFILES[m.role].toLowerCase()} en el cuidado de <strong>{m.patient_name}</strong>.</>}</p>
          <p className="tw:mt-2 tw:text-sm tw:text-muted">{m.is_owner ? `${record.full_name} es responsable de este círculo de cuidado.` : `${record.full_name} no es responsable de este círculo de cuidado.`}</p>
        </div><button type="button" className={button} onClick={() => onSelect('patients', m.patient_id)}>Ver adulto mayor</button></div>
      </article>)}</div> : <p>No tiene vínculos de cuidado registrados.</p>}
      {!record.is_active && <div className={info}><h3 className="tw:mb-3 tw:font-semibold">Desactivación registrada</h3><p>Fecha de desactivación: {directoryDate(record.deactivated_at)} · Santiago</p><p className="tw:mt-3 tw:whitespace-pre-wrap tw:break-words">Motivo: {record.deactivation_reason || 'No registrado'}</p></div>}
      {record.is_active && <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5"><div><h3 className="tw:font-semibold">Desactivar esta cuenta</h3><p className="tw:mt-2 tw:max-w-xl tw:text-muted">Se conservarán sus datos y vínculos de cuidado. Se pedirá un motivo antes de confirmar.</p></div><button className={`${button} tw:text-negative`} type="button" onClick={() => onDeactivate(record)}>Desactivar cuenta</button></div>}
    </> : <>
      <p className={info}>Esta ficha identifica al adulto mayor que recibe cuidados. No es una cuenta de acceso: puede existir aunque la persona no tenga correo ni utilice la app. Si tiene una cuenta propia, su vínculo puede aparecer con el rol «Adulto mayor».</p>
      <div><h3 className="tw:text-xl tw:font-bold">Círculo de cuidado</h3><p className="tw:mt-2 tw:text-muted">Cuentas vinculadas a este adulto mayor y el rol con el que participan en su cuidado. «Responsable» identifica a quien administra el círculo de cuidado.</p></div>
      {record.members.length ? <div className={scroll}><table className={table}><thead><tr><th>Persona</th><th>Correo</th><th>Rol en el cuidado</th><th>Responsable</th><th>Estado de la cuenta</th><th>Acción</th></tr></thead><tbody>
        {record.members.map(m => <tr key={m.user_id}><td>{m.full_name}</td><td>{m.email}</td><td><span className="tw:inline-block tw:rounded-full tw:bg-brand-soft tw:px-3 tw:py-1 tw:font-semibold tw:text-brand-ink">{MOBILE_PROFILES[m.role]}</span></td><td>{m.is_owner ? 'Sí' : 'No'}</td><td>{m.is_active ? 'Activa' : 'Inactiva'}</td><td><button type="button" className={button} onClick={() => onSelect('users', m.user_id)}>Ver cuenta</button></td></tr>)}
      </tbody></table></div> : <p>Este adulto mayor no tiene cuentas vinculadas.</p>}
    </>}
    <details className="tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm tw:text-muted"><summary className="tw:cursor-pointer tw:font-semibold">Identificador del registro</summary><p className="tw:mt-3 tw:break-all">{'user_id' in record ? record.user_id : record.patient_id}</p></details>
  </div>;
}

const info = 'tw:rounded-xl tw:bg-canvas tw:p-5 tw:leading-relaxed';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const scroll = 'tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke';
const table = 'tw:w-full tw:min-w-[640px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5 tw:[&_td]:leading-relaxed';
