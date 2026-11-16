import { useEffect, useState } from 'react';
import { fetchSettings, type SystemSetting } from '../../api/settings';
import { settingName, settingDescription, settingDate } from '../../lib/settingsMeta';
import { SettingEditor } from './SettingEditor';
import { settingsStyles as s } from './settingsStyles';

const summaries: Record<string, [string, string]> = {
  plan_prices: ['Planes', 'Cambia los precios mensuales de los planes de pago.'],
  churn_definition: ['Indicadores', 'Define cuándo se considera que una cuenta se ha dado de baja.'],
  feature_flags: ['Contenido', 'Permite o pausa nuevas recopilaciones y adaptaciones de noticias.'],
  system_texts: ['Comunicación', 'Publica, modifica o retira un aviso dentro de la consola.'],
};

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
      setSettings(rows); setLoading(false);
    }).catch(exception => {
      if (!controller.signal.aborted) { setError(exception instanceof Error ? exception.message : 'No se pudo cargar la configuración.'); setLoading(false); }
    });
    return () => controller.abort();
  }, [attempt]);
  const current = settings.find(setting => setting.key === selected);
  const visible = settings.filter(setting => `${setting.key} ${settingName(setting)} ${settingDescription(setting)}`.toLowerCase().includes(query.trim().toLowerCase()));
  function reload() { setError(''); setLoading(true); setAttempt(value => value + 1); }
  return <section aria-label="Configuración del sistema" className="tw:space-y-6 tw:text-base tw:leading-relaxed tw:text-ink">
    <header><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Administración</p>
      <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Configuración del sistema</h1>
      <p className="tw:mt-2 tw:text-muted">Elige qué quieres ajustar. Cada cambio requiere una explicación y queda registrado en auditoría.</p>
    </header>
    <div className={`${s.panel} tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4`}>
      <label className={`${s.label} tw:w-full tw:max-w-lg`}>Buscar una opción
        <input className={s.field} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Por ejemplo: planes, noticias o aviso" />
      </label>
      <button type="button" className={s.button} disabled={loading} onClick={reload}>Actualizar opciones</button>
    </div>
    {loading ? <div className={`${s.panel} tw:flex tw:items-center tw:justify-center tw:gap-3 tw:py-14`} role="status"><span aria-hidden="true" className="tw:size-5 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Cargando configuración…</div>
      : error ? <div className={s.error} role="alert"><p>{error}</p><button type="button" className={s.button} onClick={reload}>Reintentar</button></div>
        : settings.length === 0 ? <div className={s.panel}>No hay parámetros de configuración disponibles.</div>
          : <>
            <p className={s.muted}>{visible.length} opciones disponibles{query && <button type="button" className="tw:ml-4 tw:cursor-pointer tw:bg-transparent tw:font-semibold tw:text-brand-ink tw:underline" onClick={() => setQuery('')}>Limpiar búsqueda</button>}</p>
            <div className="tw:grid tw:gap-5 tw:md:grid-cols-2 tw:xl:grid-cols-3">
              {visible.map(setting => {
                const [group, summary] = summaries[setting.key] || [setting.key.startsWith('ops_thresholds.') ? 'Estado operativo' : 'Otros parámetros', settingDescription(setting)];
                return <article key={setting.key} className={`${s.panel} tw:flex tw:flex-col tw:gap-4`}>
                  <span className="tw:w-fit tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1 tw:text-xs tw:font-semibold tw:text-brand-ink">{group}</span>
                  <div><h2 className="tw:text-lg tw:font-bold">{settingName(setting)}</h2><p className="tw:mt-2 tw:text-muted">{summary}</p></div>
                  <p className={`${s.muted} tw:mt-auto`}>Versión {setting.version} · {setting.updated_at ? `Actualizado: ${settingDate(setting.updated_at)}` : 'Sin cambios registrados'}</p>
                  <button type="button" className={`${s.button} ${s.primary} tw:w-full`} aria-haspopup="dialog" aria-label={`Configurar ${settingName(setting)}`} onClick={() => setSelected(setting.key)}>Ver y modificar →</button>
                </article>;
              })}
            </div>
            {!visible.length && <div className={s.panel}>No hay opciones que coincidan con tu búsqueda.</div>}
          </>}
    {current && <SettingEditor key={current.key} setting={current} onClose={() => setSelected('')} onSaved={saved => setSettings(rows => rows.map(row => row.key === saved.key ? saved : row))} />}
  </section>;
}
