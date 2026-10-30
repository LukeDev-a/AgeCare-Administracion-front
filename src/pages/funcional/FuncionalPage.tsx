import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchFeatureAdoption, fetchFeatureAlerts, fetchTopFeatures } from '../../api/features';
import { PeriodSelector } from '../../components/PeriodSelector';
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
  return <>
    <div className="filter-row"><span className="filter-label">Período</span>
      <PeriodSelector periods={PERIODS} value={days} onChange={setDays} />
      <button className="action-button" type="button" onClick={() => setReload(value => value+1)}>Actualizar vista</button>
    </div>
    <p className="mini-note">Adopción: porcentaje de usuarios activos de cada perfil que usaron una función en el mismo período.</p>
    <p className="mini-note">No aplica indica que la función no corresponde al perfil. No calculable indica que no se puede obtener un porcentaje con los datos disponibles.</p>
    <section className="card">
      <div className="card-title">Adopción de funcionalidades por perfil</div>
      {adoptionState.error && <p role="alert">{adoptionState.error}</p>}
      {!adoption && !adoptionState.error && <p>Cargando adopción...</p>}
      {adoption && <>
        <p className="card-sub">Últimos {adoption.days} días · Calculado: {usersSupportDate(adoption.computed_at)} · Santiago</p>
        {adoption.features.some(feature => !feature.calculation_details) && <p role="status">El estado del cálculo no está disponible en esta respuesta; los porcentajes recibidos no permiten distinguir todos los casos.</p>}
        <div style={{ overflowX: 'auto' }}><HeatmapTable data={adoption} /></div>
        {!!adoption.features.length && !!adoption.roles.length && <HeatmapLegend statesAvailable={adoption.features.every(feature => !!feature.calculation_details)} />}
      </>}
    </section>
    <div className="grid g2">
      <section className="card">
        <div className="card-title">Más utilizadas por perfil</div>
        <label>Funciones a mostrar por perfil <select value={limit} onChange={event => setLimit(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
        </select></label>
        {topState.error && <p role="alert">{topState.error}</p>}
        {!top && !topState.error && <p>Cargando ranking...</p>}
        {top && top.calculable_only !== true && <p role="status">No se puede verificar si este ranking excluye resultados no calculables. Actualiza la API para consultar el ranking validado.</p>}
        {top?.calculable_only === true && <>
          <p className="card-sub">Últimos {days} días · Calculado: {usersSupportDate(top.computed_at)} · Santiago</p>
          <p className="mini-note">Solo porcentajes calculables, de mayor a menor; se conserva el cero válido.</p>
          {!top.top_by_role.length && <p>Sin datos de funcionalidades por perfil.</p>}
          {top.top_by_role.map(item => <div key={item.role} style={{ marginTop: 14 }}>
            <h3><span className="swatch" style={{ background: FEATURE_ROLE_COLORS[item.role] ?? 'var(--ink)' }} />{featureRoleName(item.role)}</h3>
            {!item.features.length ? <p>Sin resultados de adopción para este perfil.</p> : <ol>
              {item.features.map(feature => <li key={feature.feature_key}>{feature.name}: {feature.adoption == null ? 'Sin datos' : adoptionPercent(feature.adoption)}</li>)}
            </ol>}
          </div>)}
        </>}
      </section>
      <section className="card">
        <div className="card-title">Alertas de uso bajo</div>
        <form className="tickets-toolbar" onSubmit={changeThreshold}>
          <label>Umbral de adopción (%)<input type="number" name="threshold" min={1} max={50} step="any" defaultValue={15} required /></label>
          <button className="action-button" type="submit">Aplicar umbral</button>
        </form>
        {alertsState.error && <p role="alert">{alertsState.error}</p>}
        {!alerts && !alertsState.error && <p>Cargando alertas...</p>}
        {alerts && alerts.calculable_only !== true && <p role="status">No se puede verificar si esta respuesta excluye porcentajes no calculables. Actualiza la API para consultar alertas validadas.</p>}
        {alerts?.calculable_only === true && <>
          <p className="card-sub">Últimos {days} días · Por debajo de {percent(alerts.threshold)} · Calculado: {usersSupportDate(alerts.computed_at)} · Santiago</p>
          <h3>Uso bajo a revisar</h3><FeatureAlertList alerts={alerts.alerts.filter(alert => !alert.expected_low)} expected={false} />
          <h3>Uso bajo esperado</h3><p className="mini-note">Por ejemplo, una función de emergencia puede utilizarse poco sin que eso indique falta de adopción.</p>
          <FeatureAlertList alerts={alerts.alerts.filter(alert => alert.expected_low)} expected />
        </>}
      </section>
    </div>
  </>;
}
