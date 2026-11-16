import { useState, type FormEvent } from 'react';
import { fetchSettings, updateSetting, SettingsError, type SettingValue, type SystemSetting } from '../../api/settings';
import { displayValue, fieldName, rules, settingDate, settingDescription, settingName, supportsFields } from '../../lib/settingsMeta';
import { SettingValueFields } from './SettingValueFields';
import { Modal } from '../../components/Modal';
import { settingsStyles as s } from './settingsStyles';

export function SettingEditor({ setting, onSaved, onClose = () => {} }: { setting: SystemSetting; onSaved: (setting: SystemSetting) => void; onClose?: () => void }) {
  const [base, setBase] = useState(setting);
  const [draft, setDraft] = useState(JSON.stringify(setting.value, null, 2));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState<{ field: string; issue: string }[]>([]);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<SystemSetting | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmLatest, setConfirmLatest] = useState(false);
  let parsed: SettingValue = null;
  let validJson = true;
  try { parsed = JSON.parse(draft); } catch { validJson = false; }
  const fields = validJson && supportsFields(parsed, base.schema);
  const dirty = validJson && JSON.stringify(parsed) !== JSON.stringify(base.value);
  const busy = saving || checking;
  const saveDisabled = busy || conflict || !validJson || !dirty || note.trim().length < 5 || note.trim().length > 500;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || conflict) return;
    setMessage(''); setError(''); setDetails([]);
    if (!validJson) { setError('El valor estructurado no es válido. Revisa comillas, comas y corchetes.'); return; }
    if (!dirty) { setError('Modifica el valor antes de guardar.'); return; }
    if (note.trim().length < 5 || note.trim().length > 500) { setError('Indica un motivo de entre 5 y 500 caracteres.'); return; }
    setSaving(true);
    try {
      const result = await updateSetting(base.key, { value: parsed, version: base.version, change_note: note.trim() });
      setBase(result); setDraft(JSON.stringify(result.value, null, 2)); setNote(''); onSaved(result);
      if (base.key === 'system_texts') window.dispatchEvent(new Event('agecare-settings-changed'));
      setMessage(base.key === 'plan_prices'
        ? 'Precios mensuales por cuenta actualizados. Los registros históricos conservan sus valores anteriores.'
        : 'Parámetro actualizado correctamente.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo guardar el parámetro.');
      if (exception instanceof SettingsError) {
        setDetails(exception.details);
        if (exception.code === 'VERSION_CONFLICT') setConflict(true);
      }
    } finally { setSaving(false); }
  }
  async function checkLatest() {
    if (busy) return;
    setChecking(true);
    try {
      const rows = await fetchSettings(base.key);
      if (!rows[0]) throw new Error('El parámetro ya no está disponible.');
      setLatest(rows[0]);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo consultar la versión actual.'); }
    finally { setChecking(false); }
  }
  function useLatest() {
    if (!latest || busy) return;
    setBase(latest); setDraft(JSON.stringify(latest.value, null, 2)); setNote('');
    onSaved(latest); setLatest(null); setConflict(false); setError(''); setDetails([]); setConfirmLatest(false);
  }

  return <Modal title={settingName(base)} onClose={onClose} dirty={dirty || !validJson || note !== ''} busy={busy} error={error}>
    <div className="tw:space-y-6">
      <p className="tw:mt-0 tw:text-muted">{settingDescription(base)}</p>
      <dl className="tw:grid tw:gap-4 tw:rounded-xl tw:bg-canvas tw:p-4 tw:sm:grid-cols-3">
        <div><dt className={s.muted}>Versión guardada</dt><dd className="tw:mt-1 tw:font-semibold">{base.version}</dd></div>
        <div><dt className={s.muted}>Última modificación</dt><dd className="tw:mt-1 tw:font-semibold">{settingDate(base.updated_at)}</dd></div>
        <div><dt className={s.muted}>Modificado por</dt><dd className="tw:mt-1 tw:font-semibold">{base.updated_by?.name || (base.updated_by?.admin_id ? 'Administrador sin nombre registrado' : 'Sin cambios registrados')}</dd></div>
      </dl>
      {message && <p role="status" className={`${s.notice} tw:text-positive`}>{message}</p>}
      {details.length > 0 && <ul className={`${s.error} tw:list-disc tw:pl-8`}>{details.map((detail, index) => <li key={index}>{fieldName(detail.field.replace(/^value\./, ''), {})}: {detail.issue}</li>)}</ul>}
      {conflict && <section className={s.error} aria-label="Cambios de otro administrador">
        <h3 className="tw:font-bold">Hay una versión más reciente</h3>
        <p>Otro administrador modificó esta opción. Tus cambios se conservan, pero no se pueden guardar sobre la versión anterior.</p>
        <button className={s.button} type="button" disabled={busy} onClick={() => void checkLatest()}>{checking ? 'Consultando…' : 'Consultar versión actual'}</button>
        {latest && <div className="tw:mt-5 tw:space-y-4"><p>Versión {latest.version} · {settingDate(latest.updated_at)} · {latest.updated_by?.name || 'Sin responsable disponible'}</p>
          <pre className="tw:rounded-xl tw:bg-canvas tw:p-4 tw:font-sans tw:whitespace-pre-wrap tw:break-words">{displayValue(latest.value, latest.schema)}</pre>
          {confirmLatest ? <div className={s.notice} role="alert"><p>Se descartarán los valores y la explicación que estás editando. ¿Quieres cargar la versión actual?</p><div className={s.actions}>
            <button type="button" className={s.button} disabled={busy} onClick={() => setConfirmLatest(false)}>Conservar mi borrador</button>
            <button type="button" className={`${s.button} ${s.primary}`} disabled={busy} onClick={useLatest}>Descartar y cargar versión actual</button>
          </div></div> : <button className={s.button} type="button" disabled={busy} onClick={() => setConfirmLatest(true)}>Cargar versión actual y descartar borrador</button>}
        </div>}
      </section>}
      <form onSubmit={save} className="tw:space-y-6">
        <section className={s.section}><h3 className="tw:text-lg tw:font-bold">1. Ajusta los valores</h3>
          {fields ? <SettingValueFields key={base.version} value={parsed} schema={base.schema} disabled={busy || conflict}
            onChange={value => { setDraft(JSON.stringify(value, null, 2)); setMessage(''); }} />
            : <label className={s.label}>Valor estructurado (JSON)
              <textarea className={`${s.field} tw:min-h-60 tw:font-mono`} value={draft} rows={10} spellCheck={false} disabled={busy || conflict}
                onChange={event => { setDraft(event.target.value); setMessage(''); }} />
              <small className={s.muted}>Conserva la estructura y respeta las reglas de validación.</small>
              {!validJson && <small role="alert">El valor estructurado no es válido. Revisa comillas, comas y corchetes.</small>}
            </label>}
        </section>
        <section className={s.section}><h3 className="tw:text-lg tw:font-bold">2. Explica el cambio</h3>
          <label className={s.label}>¿Por qué haces este cambio?
            <textarea className={`${s.field} tw:min-h-28`} value={note} required minLength={5} maxLength={500} rows={3} disabled={busy || conflict}
              onChange={event => setNote(event.target.value)} placeholder="Ej.: Actualización acordada por el equipo." aria-label="¿Por qué haces este cambio?" aria-describedby="setting-note-help" />
            <small id="setting-note-help" className={s.muted}>Obligatorio · De 5 a 500 caracteres. Esta explicación se guarda en auditoría; no se muestra como aviso a los usuarios.</small>
          </label>
        </section>
        <div className={`${s.actions} tw:justify-between`}>
          <p className={s.muted}>{conflict ? 'Carga la versión actual para poder continuar.' : !validJson ? 'Corrige el valor antes de guardar.' : !dirty ? 'Modifica un valor para habilitar el guardado.' : note.trim().length < 5 ? 'Falta explicar el cambio.' : 'Cambios pendientes de guardar.'}</p>
          <button className={`${s.button} ${s.primary}`} type="submit" disabled={saveDisabled}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
      <details className={`${s.section} tw:space-y-0 tw:p-4`}><summary className="tw:cursor-pointer tw:font-semibold">Consultar el valor guardado y sus reglas</summary>
        <pre className="tw:font-sans tw:whitespace-pre-wrap tw:break-words">{displayValue(base.value, base.schema)}</pre>
        <ul className="tw:list-disc tw:space-y-2 tw:pl-5">{rules(base.schema).map(rule => <li key={rule}>{rule}</li>)}
          {(base.schema.required ?? []).length > 0 && <li>Campos obligatorios: {base.schema.required?.map(key => fieldName(key, base.schema.properties?.[key] ?? {})).join(', ')}</li>}
          {base.schema.additionalProperties === false && <li>No se permiten campos adicionales.</li>}
          {Object.entries(base.schema.properties ?? {}).map(([key, schema]) => <li key={key}>{fieldName(key, schema)}: {rules(schema).join(' · ') || 'Validación del servidor'}</li>)}
        </ul>
      </details>
      <details className={`${s.section} tw:space-y-0 tw:p-4`}><summary className="tw:cursor-pointer tw:font-semibold">Información técnica para soporte</summary><p className="tw:break-all">Identificador: {base.key}</p><p className="tw:break-all">Responsable: {base.updated_by?.admin_id || 'Sin identificador registrado'}</p><pre className="tw:overflow-x-auto tw:rounded-xl tw:bg-canvas tw:p-4 tw:text-xs">{JSON.stringify(base.schema, null, 2)}</pre></details>
    </div>
  </Modal>;
}
