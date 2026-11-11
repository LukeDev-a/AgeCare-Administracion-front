import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchFeatureAdoption, fetchFeatureAlerts, fetchTopFeatures } from '../../api/features';
import { FEATURE_ROLE_COLORS, featureRoleName } from '../../lib/featureRoleMeta';
import { percent } from '../../lib/format';
import { adoptionPercent } from '../../lib/featureCalculationMeta';
import { usersSupportDate } from '../../lib/usersSupportMeta';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapTable } from './HeatmapTable';
import { FeatureAlertList } from './FeatureAlertList';

const PERIODS = [{ key: 7, label: 'Últimos 7 días' }, { key: 30, label: 'Últimos 30 días' }, { key: 90, label: 'Últimos 90 días' }] as const;
function useRemote<T>(key: string, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    load().then(data => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error: unknown) => { if (!cancelled) setState({ key, data: null,
        error: error instanceof Error ? error.message : 'No fue posible consultar los datos.' }); });
    return () => { cancelled = true; };
  }, [key, load]);
  return state.key === key ? state : { key, data: null, error: '' };
}
export function FuncionalPage() {
  const [section, setSection] = useState('comparison');
  const [days, setDays] = useState<number>(30);
  const [limit, setLimit] = useState(1);
  const [threshold, setThreshold] = useState(.15);
  const [reload, setReload] = useState(0);
  const adoptionLoad = useCallback(() => fetchFeatureAdoption(days), [days]);
  const topLoad = useCallback(() => fetchTopFeatures(days, limit), [days, limit]);
  const alertsLoad = useCallback(() => fetchFeatureAlerts(days, threshold), [days, threshold]);
  const adoptionState = useRemote(`adoption:${days}:${reload}`, adoptionLoad);
  const topState = useRemote(`top:${days}:${limit}:${reload}`, topLoad);
  const alertsState = useRemote(`alerts:${days}:${threshold}:${reload}`, alertsLoad);
  const adoption = adoptionState.data, top = topState.data, alerts = alertsState.data;
  function changeThreshold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get('threshold'));
    if (Number.isFinite(value) && value >= 1 && value <= 50) setThreshold(value / 100);
  }
  return <div className="tw:space-y-7 tw:text-base tw:leading-relaxed tw:text-ink">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
      <div><p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Analítica de la aplicación</p>
        <h1 className="tw:text-2xl tw:font-bold tw:sm:text-3xl">Uso por funcionalidad</h1>
        <p className={description}>Descubre qué funciones utiliza cada perfil de la app móvil y cuáles conviene revisar.</p>
      </div>
      <button className={button} type="button" onClick={() => setReload(value => value+1)}><span aria-hidden="true">↻ </span>Actualizar vista</button>
    </header>
    <div className={`${panel} tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-5`}>
      <div><h2 className="tw:font-semibold">Período de consulta</h2><p className="tw:mt-1 tw:text-muted">Se aplica a la comparación, al ranking y a los avisos de uso bajo.</p></div>
      <label className={label}>Mostrar actividad de
        <select className={field} aria-label="Período de consulta" value={days} onChange={event => setDays(Number(event.target.value))}>
          {PERIODS.map(period => <option key={period.key} value={period.key}>{period.label}</option>)}
        </select>
      </label>
    </div>
    <p className={notice}><strong>Qué significa adopción:</strong> porcentaje de usuarios activos de cada perfil que usaron una función en el mismo período. Por ejemplo, 40 % significa que 40 de cada 100 usuarios activos la utilizaron.</p>
    <nav aria-label="Secciones de uso por funcionalidad" className="tw:flex tw:flex-wrap tw:gap-2 tw:rounded-2xl tw:bg-canvas tw:p-2">
      {[['comparison', 'Comparar por perfil'], ['ranking', 'Más utilizadas'], ['alerts', 'Uso bajo']].map(([key, title]) => <button
        key={key} type="button" aria-pressed={section === key} aria-controls={`features-${key}`} onClick={() => setSection(key)}
        className={`${button} ${section === key ? 'tw:border-brand tw:bg-brand-soft tw:text-brand-ink' : ''}`}>{title}</button>)}
    </nav>
    <div id="features-comparison" hidden={section !== 'comparison'}>
    <section className={panel} aria-label="Adopción de funcionalidades por perfil" aria-busy={!adoption && !adoptionState.error}>
      <h2 className={heading}>Adopción de funcionalidades por perfil</h2>
      <p className={description}>Cada fila representa una función y cada columna, un perfil. Compara los porcentajes para conocer su alcance.</p>
      {adoptionState.error && <p role="alert" className={notice}>{adoptionState.error}</p>}
      {!adoption && !adoptionState.error && <p role="status" className={notice}>Cargando adopción...</p>}
      {adoption && <>
        <p className="tw:my-4 tw:font-semibold tw:text-brand-ink">Últimos {adoption.days} días</p>
        {adoption.features.some(feature => !feature.calculation_details) && <p role="status" className={notice}>El estado del cálculo no está disponible en esta respuesta; los porcentajes recibidos no permiten distinguir todos los casos.</p>}
        <div className="tw:my-5 tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke"><HeatmapTable data={adoption} /></div>
        {!!adoption.features.length && !!adoption.roles.length && <HeatmapLegend statesAvailable={adoption.features.every(feature => !!feature.calculation_details)} />}
        <Updated value={adoption.computed_at} />
      </>}
    </section>
    </div>
    <div id="features-ranking" hidden={section !== 'ranking'}>
      <section className={panel} aria-label="Más utilizadas por perfil" aria-busy={!top && !topState.error}>
        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
        <div><h2 className={heading}>Más utilizadas por perfil</h2><p className={description}>Consulta las funciones con mayor porcentaje de uso dentro de cada perfil.</p></div>
        <label className={label}>Funciones a mostrar por perfil <select className={field} value={limit} onChange={event => setLimit(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
        </select></label></div>
        {topState.error && <p role="alert" className={notice}>{topState.error}</p>}
        {!top && !topState.error && <p role="status" className={notice}>Cargando ranking...</p>}
        {top && top.calculable_only !== true && <p role="status" className={notice}>No se puede verificar si este ranking excluye resultados no calculables. Actualiza la API para consultar el ranking validado.</p>}
        {top?.calculable_only === true && <>
          <p className={notice}>Últimos {days} días · Solo porcentajes calculables, de mayor a menor; se conserva el cero válido.</p>
          {!top.top_by_role.length && <p>Sin datos de funcionalidades por perfil.</p>}
          <div className="tw:grid tw:gap-5 tw:lg:grid-cols-2">{top.top_by_role.map(item => <div key={item.role} className="tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:p-5">
            <h3 className="tw:mb-5 tw:flex tw:items-center tw:gap-3 tw:text-lg tw:font-semibold"><span aria-hidden="true" className="tw:h-3 tw:w-3 tw:rounded-full" style={{ background: FEATURE_ROLE_COLORS[item.role] ?? 'var(--ink)' }} />{featureRoleName(item.role)}</h3>
            {!item.features.length ? <p className="tw:text-muted">Sin resultados de adopción para este perfil.</p> : <ol className="tw:space-y-5">
              {item.features.map((feature, index) => <li key={feature.feature_key}>
                <div className="tw:flex tw:items-start tw:gap-3"><span className="tw:font-bold tw:text-muted" aria-label={`Posición ${index+1}`}>{index+1}.</span>
                  <span className="tw:font-semibold">{feature.name}: {feature.adoption == null ? 'Sin datos' : adoptionPercent(feature.adoption)}</span></div>
                {feature.adoption != null && <div aria-hidden="true" className="tw:mt-2 tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-panel"><div className="tw:h-full tw:rounded-full" style={{ width: `${Math.max(0, Math.min(100, feature.adoption * 100))}%`, backgroundColor: FEATURE_ROLE_COLORS[item.role] ?? 'var(--brand)' }} /></div>}
              </li>)}
            </ol>}
          </div>)}</div>
          <Updated value={top.computed_at} />
        </>}
      </section>
    </div>
    <div id="features-alerts" hidden={section !== 'alerts'}>
      <section className={panel} aria-label="Alertas de uso bajo" aria-busy={!alerts && !alertsState.error}>
        <h2 className={heading}>Alertas de uso bajo</h2>
        <p className={description}>Encuentra funciones cuyo porcentaje de uso está por debajo del límite elegido. Estos avisos sirven para analizar el uso; no son alertas de salud.</p>
        <form className="tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:gap-4" onSubmit={changeThreshold}>
          <label className={label}>Umbral de adopción (%)<input className={field} type="number" name="threshold" min={1} max={50} step="any" defaultValue={15} required /><span className="tw:text-sm tw:font-normal tw:text-muted">Entre 1 y 50 %. Por ejemplo, 15 busca usos inferiores al 15 %.</span></label>
          <button className={button} type="submit">Aplicar umbral</button>
        </form>
        {alertsState.error && <p role="alert" className={notice}>{alertsState.error}</p>}
        {!alerts && !alertsState.error && <p role="status" className={notice}>Cargando alertas...</p>}
        {alerts && alerts.calculable_only !== true && <p role="status" className={notice}>No se puede verificar si esta respuesta excluye porcentajes no calculables. Actualiza la API para consultar alertas validadas.</p>}
        {alerts?.calculable_only === true && <>
          <p className={notice}>Últimos {days} días · Por debajo de {percent(alerts.threshold)}</p>
          <h3 className="tw:mb-4 tw:mt-6 tw:text-lg tw:font-semibold">Uso bajo a revisar</h3><FeatureAlertList alerts={alerts.alerts.filter(alert => !alert.expected_low)} expected={false} />
          <h3 className="tw:mb-3 tw:mt-8 tw:text-lg tw:font-semibold">Uso bajo esperado</h3><p className={description}>Por ejemplo, una función de emergencia puede utilizarse poco sin que eso indique falta de adopción.</p>
          <FeatureAlertList alerts={alerts.alerts.filter(alert => alert.expected_low)} expected />
          <Updated value={alerts.computed_at} />
        </>}
      </section>
    </div>
  </div>;
}

function Updated({ value }: { value: string }) {
  return <p className="tw:mt-6 tw:flex tw:flex-wrap tw:gap-x-2 tw:gap-y-1 tw:border-t tw:border-solid tw:border-stroke tw:pt-4 tw:text-sm tw:text-muted">
    Última actualización de los indicadores <strong className="tw:text-ink">{usersSupportDate(value)}</strong> <span>(hora de Santiago)</span>
  </p>;
}

const panel = 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-7';
const heading = 'tw:text-xl tw:font-bold tw:tracking-tight';
const description = 'tw:mt-2 tw:mb-4 tw:max-w-3xl tw:leading-relaxed tw:text-muted';
const label = 'tw:grid tw:gap-2 tw:font-semibold';
const field = 'tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:text-base tw:text-ink tw:sm:w-56 tw:focus-visible:outline-2 tw:focus-visible:outline-brand';
const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-base tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const notice = 'tw:my-4 tw:rounded-xl tw:bg-canvas tw:p-4 tw:leading-relaxed tw:text-muted';
