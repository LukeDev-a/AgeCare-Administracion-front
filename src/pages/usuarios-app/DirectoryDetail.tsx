import type { EndUserDetail, PatientDetail } from '../../api/endUsers';
import { directoryDate, MOBILE_PROFILES } from '../../lib/endUsersMeta';

export function DirectoryDetail({ record, onSelect, onDeactivate, onClose }: {
  record: EndUserDetail | PatientDetail; onSelect: (kind: 'users' | 'patients', id: string) => void;
  onDeactivate: (user: EndUserDetail) => void; onClose: () => void;
}) {
  return <div className="card" aria-label="Detalle de usuario o paciente">
    <div className="card-head"><div><h2 className="card-title">{record.full_name}</h2><p className="card-sub">Datos de demostración · {'user_id' in record ? 'Cuenta de acceso de prueba' : 'Ficha de paciente de prueba'}</p></div>
      <button className="theme-toggle" type="button" onClick={onClose}>Cerrar detalle</button></div>
    {'user_id' in record ? <>
      <dl className="audit-detail-grid"><div><dt>Identificador</dt><dd>{record.user_id}</dd></div><div><dt>Correo</dt><dd>{record.email}</dd></div>
        <div><dt>Estado de la cuenta de prueba</dt><dd>{record.is_active ? 'Activa' : 'Inactiva'}</dd></div></dl>
      <h3 className="card-title">Vínculos de cuidado</h3>
      <p className="card-sub">El perfil corresponde a cada paciente. Una persona puede tener distintos perfiles.</p>
      {record.memberships.length ? <div className="audit-table-scroll"><table className="data"><thead><tr><th>Paciente</th><th>Perfil</th><th>Responsable del círculo</th><th>Acción</th></tr></thead><tbody>
        {record.memberships.map(m => <tr key={m.patient_id}><td>{m.patient_name}</td><td>{MOBILE_PROFILES[m.role]}</td><td>{m.is_owner ? 'Sí' : 'No'}</td><td><button type="button" className="theme-toggle" onClick={() => onSelect('patients', m.patient_id)}>Ver paciente</button></td></tr>)}
      </tbody></table></div> : <p>No tiene vínculos de cuidado registrados.</p>}
      {!record.is_active && <><p>Fecha de desactivación: {directoryDate(record.deactivated_at)} · Santiago</p><p>Motivo: {record.deactivation_reason || 'No registrado en el ejemplo inicial'}</p></>}
      {record.is_active && <div className="ticket-form-actions"><button className="staff-delete-button" type="button" onClick={() => onDeactivate(record)}>Desactivar cuenta de prueba</button></div>}
    </> : <>
      <p>Identificador: {record.patient_id}</p><p className="card-sub">Una ficha de paciente no implica que exista una cuenta de acceso propia. Aquí se muestran únicamente identificación y vínculos.</p>
      <h3 className="card-title">Círculo de cuidado</h3>
      {record.members.length ? <div className="audit-table-scroll"><table className="data"><thead><tr><th>Persona</th><th>Correo</th><th>Perfil</th><th>Responsable</th><th>Cuenta de prueba</th><th>Acción</th></tr></thead><tbody>
        {record.members.map(m => <tr key={m.user_id}><td>{m.full_name}</td><td>{m.email}</td><td>{MOBILE_PROFILES[m.role]}</td><td>{m.is_owner ? 'Sí' : 'No'}</td><td>{m.is_active ? 'Activa' : 'Inactiva'}</td><td><button type="button" className="theme-toggle" onClick={() => onSelect('users', m.user_id)}>Ver cuenta</button></td></tr>)}
      </tbody></table></div> : <p>Este paciente de prueba no tiene miembros vinculados.</p>}
    </>}
  </div>;
}
