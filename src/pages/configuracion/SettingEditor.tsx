import { useState, type FormEvent } from 'react';
import { fetchSettings, updateSetting, SettingsError, type SettingValue, type SystemSetting } from '../../api/settings';
import { displayValue, fieldName, rules, settingDate, settingDescription, settingName, supportsFields } from '../../lib/settingsMeta';
import { SettingValueFields } from './SettingValueFields';

export function SettingEditor({ setting, onSaved }: { setting: SystemSetting; onSaved: (setting: SystemSetting) => void }) {
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
  let parsed: SettingValue = null;
  let validJson = true;
  try { parsed = JSON.parse(draft); } catch { validJson = false; }
  const fields = validJson && supportsFields(parsed, base.schema);
  const dirty = validJson && JSON.stringify(parsed) !== JSON.stringify(base.value);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || conflict) return;
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
    setChecking(true);
    try {
      const rows = await fetchSettings(base.key);
      if (!rows[0]) throw new Error('El parámetro ya no está disponible.');
      setLatest(rows[0]);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo consultar la versión actual.'); }
    finally { setChecking(false); }
  }
  function useLatest() {
    if (!latest || !window.confirm('Se reemplazará tu borrador por el valor actual. ¿Deseas continuar?')) return;
    setBase(latest); setDraft(JSON.stringify(latest.value, null, 2)); setNote('');
    onSaved(latest); setLatest(null); setConflict(false); setError(''); setDetails([]);
  }

  return <div className="card settings-editor">
    <h2 className="card-title">{settingName(base)}</h2>
    <p className="card-sub">{settingDescription(base)}</p>
    <dl className="settings-metadata">
      <div><dt>Versión</dt><dd>{base.version}</dd></div>
      <div><dt>Último cambio</dt><dd>{settingDate(base.updated_at)}</dd></div>
      <div><dt>Responsable</dt><dd>{base.updated_by?.name || base.updated_by?.admin_id || 'Sin cambios registrados'}</dd></div>
    </dl>
    <details className="settings-current"><summary>Valor actual guardado</summary><pre>{displayValue(base.value, base.schema)}</pre></details>
    <details className="settings-rules"><summary>Reglas de validación</summary>
      <ul>{rules(base.schema).map(rule => <li key={rule}>{rule}</li>)}
        {(base.schema.required ?? []).length > 0 && <li>Campos obligatorios: {base.schema.required?.map(key => fieldName(key, base.schema.properties?.[key] ?? {})).join(', ')}</li>}
        {base.schema.additionalProperties === false && <li>No se permiten campos adicionales.</li>}
        {Object.entries(base.schema.properties ?? {}).map(([key, schema]) => <li key={key}>{fieldName(key, schema)}: {rules(schema).join(' · ') || 'Validación del servidor'}</li>)}
      </ul>
    </details>
    <details><summary>Información técnica (para soporte)</summary><p>Identificador interno: {base.key}</p><pre>{JSON.stringify(base.schema, null, 2)}</pre></details>
    <form onSubmit={save}>
      <h3 className="settings-edit-title">Editar valor</h3>
      {fields ? <SettingValueFields key={base.version} value={parsed} schema={base.schema} disabled={saving || conflict}
        onChange={value => { setDraft(JSON.stringify(value, null, 2)); setMessage(''); }} />
        : <label className="settings-field">Valor estructurado (JSON)
          <textarea className="settings-json" value={draft} rows={10} spellCheck={false} disabled={saving || conflict}
            onChange={event => { setDraft(event.target.value); setMessage(''); }} />
          <small>Conserva la estructura y respeta las reglas de validación del parámetro.</small>
          {!validJson && <small role="alert">El valor estructurado no es válido. Revisa comillas, comas y corchetes.</small>}
        </label>}
      <label className="settings-field">Motivo del cambio
        <textarea value={note} required minLength={5} maxLength={500} rows={3} disabled={saving || conflict}
          onChange={event => setNote(event.target.value)} placeholder="Explica por qué se modifica este parámetro." />
        <small>Obligatorio · entre 5 y 500 caracteres</small>
      </label>
      {error && <div className="audit-error" role="alert"><p>{error}</p>{details.length > 0 && <ul>{details.map((detail, index) => <li key={index}>{detail.field}: {detail.issue}</li>)}</ul>}</div>}
      {message && <p role="status">{message}</p>}
      {conflict && <div className="settings-conflict" role="status">
        <p>Otro administrador modificó este parámetro. Tu borrador se conserva y no se enviará de nuevo hasta cargar la versión actual.</p>
        <button className="theme-toggle" type="button" disabled={checking} onClick={() => void checkLatest()}>{checking ? 'Consultando…' : 'Consultar versión actual'}</button>
        {latest && <><p>Versión actual: {latest.version} · {settingDate(latest.updated_at)} · {latest.updated_by?.name || 'Sin responsable disponible'}</p>
          <pre>{displayValue(latest.value, latest.schema)}</pre>
          <button className="theme-toggle" type="button" onClick={useLatest}>Cargar versión actual y descartar borrador</button></>}
      </div>}
      <div className="ticket-form-actions"><button className="action-button" type="submit" disabled={saving || conflict || !dirty}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </div>;
}
