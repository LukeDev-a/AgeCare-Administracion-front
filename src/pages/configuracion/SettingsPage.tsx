import { useEffect, useState } from 'react';
import { fetchSettings, type SystemSetting } from '../../api/settings';
import { settingName } from '../../lib/settingsMeta';
import { SettingEditor } from './SettingEditor';

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(undefined, controller.signal).then(rows => {
      if (controller.signal.aborted) return;
      setSettings(rows); setSelected(rows[0]?.key ?? ''); setLoading(false);
    }).catch(exception => {
      if (!controller.signal.aborted) { setError(exception instanceof Error ? exception.message : 'No se pudo cargar la configuración.'); setLoading(false); }
    });
    return () => controller.abort();
  }, [attempt]);
  const current = settings.find(setting => setting.key === selected);
  const visible = settings.filter(setting => `${setting.key} ${settingName(setting)} ${setting.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  function select(key: string) {
    if (selected !== key && !window.confirm('Al cambiar de parámetro se descartarán los cambios que no hayas guardado. ¿Deseas continuar?')) return;
    setSelected(key);
  }
  return <section aria-label="Configuración del sistema">
    <p className="card-sub">Consulta y modifica los parámetros disponibles. Cada cambio requiere un motivo y queda registrado en auditoría.</p>
    {loading ? <div className="card" role="status">Cargando parámetros…</div> : error ? <div className="card"><p className="audit-error" role="alert">{error}</p>
      <button className="action-button" onClick={() => { setError(''); setLoading(true); setAttempt(value => value + 1); }}>Reintentar</button></div>
      : settings.length === 0 ? <div className="card">No hay parámetros de configuración disponibles.</div>
        : <div className="settings-layout"><div className="card settings-list">
          <label className="settings-field">Buscar parámetro<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o descripción" /></label>
          <nav aria-label="Parámetros de configuración">{visible.map(setting => <button key={setting.key} type="button"
            className={`settings-choice${selected === setting.key ? ' selected' : ''}`} aria-current={selected === setting.key ? 'true' : undefined}
            onClick={() => select(setting.key)}><strong>{settingName(setting)}</strong><small>Versión {setting.version}</small></button>)}</nav>
          {visible.length === 0 && <p>No hay parámetros que coincidan con la búsqueda.</p>}
        </div>{current && <SettingEditor key={current.key} setting={current} onSaved={saved => setSettings(rows => rows.map(row => row.key === saved.key ? saved : row))} />}</div>}
  </section>;
}
