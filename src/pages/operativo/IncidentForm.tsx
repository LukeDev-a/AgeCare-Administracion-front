import { useState, type FormEvent } from 'react';
import { createIncident, updateIncident, type IncidentUpdate } from '../../api/incidents';
import type { OpsIncident } from '../../api/operational';
import { useAuth } from '../../auth/AuthContext';
import { canManageIncidents } from '../../routes/permissions';
import { OPS_COMPONENTS } from '../../lib/operationalMeta';
import { INCIDENT_STATUSES, incidentNext } from '../../lib/incidentsMeta';

export function IncidentForm({ incident, onSaved, onCancel }: {
  incident?: OpsIncident; onSaved: (value: OpsIncident) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const allowed = canManageIncidents(user?.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState(incident?.status ?? 'investigating');
  const [maintenance, setMaintenance] = useState(false);
  const [localNow] = useState(() => new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0, 16));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || busy) return;
    const data = new FormData(event.currentTarget);
    const description = String(data.get('description') ?? '').trim();
    const resolution = String(data.get('resolution') ?? '').trim();
    setError(''); setBusy(true);
    try {
      let saved: OpsIncident;
      if (incident) {
        const update: IncidentUpdate = {};
        if (description !== incident.description) update.description = description;
        if (state !== incident.status) update.status = state;
        if (resolution && resolution !== incident.resolution) update.resolution = resolution;
        if (!Object.keys(update).length) { setError('No hay cambios para guardar.'); return; }
        saved = await updateIncident(incident.id, update);
      } else {
        const started = new Date(String(data.get('started_at')));
        if (Number.isNaN(started.getTime())) throw new Error('Indica una fecha de inicio válida.');
        if (!maintenance && started.getTime() > Date.now()) throw new Error('Un incidente no puede comenzar en una fecha futura.');
        saved = await createIncident({ title: String(data.get('title') ?? '').trim(), description,
          severity: String(data.get('severity')), started_at: started.toISOString(),
          component_key: String(data.get('component_key') ?? '') || null, is_maintenance: maintenance });
      }
      onSaved(saved);
    } catch (error) { setError(error instanceof Error ? error.message : 'No fue posible guardar.'); }
    finally { setBusy(false); }
  }
  if (!allowed) return null;
  const closing = state !== incident?.status && (state === 'resolved' || state === 'completed');
  return <form className="ticket-form tw:gap-5 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:[&_label]:gap-2 tw:[&_label]:text-sm tw:[&_input]:min-h-11 tw:[&_input]:min-w-0 tw:[&_select]:min-h-11 tw:[&_select]:min-w-0 tw:[&_textarea]:min-h-32 tw:[&_textarea]:text-sm tw:[&_input]:text-sm tw:[&_select]:text-sm tw:[&_input[type=checkbox]]:min-h-0 tw:[&_input[type=checkbox]]:accent-brand" onSubmit={event => void submit(event)}>
    <h3 className="wide tw:text-lg tw:font-bold">{incident ? 'Actualizar registro' : 'Registrar incidente o mantenimiento'}</h3>
    {!incident && <>
      <label className="wide">Título<input name="title" minLength={5} maxLength={160} required disabled={busy} /></label>
      <label>Severidad<select name="severity" disabled={busy}><option value="degraded">Servicio degradado</option><option value="outage">Fuera de servicio</option></select></label>
      <label>Componente<select name="component_key" disabled={busy}><option value="">Transversal · sin componente único</option>{OPS_COMPONENTS.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label><span><input type="checkbox" checked={maintenance} onChange={event => setMaintenance(event.target.checked)} disabled={busy} /> Mantenimiento programado</span></label>
      <label>Inicio · hora de tu equipo<input type="datetime-local" name="started_at" defaultValue={localNow} required disabled={busy} /></label>
    </>}
    <label className="wide">Descripción<textarea name="description" defaultValue={incident?.description ?? ''} minLength={1} maxLength={4000} required disabled={busy} /></label>
    {incident && <>
      <label>Estado<select value={state} onChange={event => setState(event.target.value)} disabled={busy}>
        {[incident.status, ...incidentNext(incident)].map(value => <option key={value} value={value}>{INCIDENT_STATUSES[value] ?? value}</option>)}
      </select></label>
      <label className="wide">Nota de resolución {closing && '(obligatoria para cerrar)'}<textarea name="resolution" defaultValue={incident.resolution ?? ''} maxLength={2000} required={closing} disabled={busy} /></label>
    </>}
    {error && <p className="wide" role="alert">{error}</p>}
    <div className="ticket-form-actions"><button type="button" className="action-button secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
      <button type="submit" className="action-button" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button></div>
  </form>;
}
