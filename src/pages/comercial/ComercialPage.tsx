import { useCallback, useEffect, useState } from 'react';
import { fetchCommercialFunnel, fetchCommercialPlans, fetchCommercialRegistrations, fetchCommercialSummary } from '../../api/commercial';
import { KpiCard } from '../../components/KpiCard';
import { PeriodSelector } from '../../components/PeriodSelector';
import { delta, deltaClass, fmt, money, moneyOrDash, percent } from '../../lib/format';
import { FunnelChart } from './FunnelChart';
import { PlanMixChart } from './PlanMixChart';
import { RegistrationsChart } from './RegistrationsChart';
import { AnalyticsMetadata, analyticsDate } from './AnalyticsMetadata';

const PERIODS = [
  { key: 'today', label: 'Hoy' }, { key: 'current_week', label: 'Semana en curso' },
  { key: 'last_7_days', label: 'Últimos 7 días' }, { key: 'current_month', label: 'Mes en curso' },
  { key: 'last_30_days', label: 'Últimos 30 días' }, { key: 'ytd', label: 'Año en curso' },
  { key: 'last_12_months', label: 'Últimos 12 meses' },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

function useRemote<T>(key: string, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    load().then(data => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error: unknown) => { if (!cancelled) setState({ key, data: null,
        error: error instanceof Error ? error.message : 'No fue posible consultar los datos.' }); });
    return () => { cancelled = true; };
  }, [key, load]);
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : '', previous: state.data };
}

const count = (value: number | null) => value == null ? 'Sin datos' : fmt(value);
const rate = (value: number | null) => value == null ? 'Sin datos' : percent(value);

export function ComercialPage() {
  const [period, setPeriod] = useState<PeriodKey>('current_month');
  const [month, setMonth] = useState('');
  const [reload, setReload] = useState(0);
  const summaryLoad = useCallback(() => fetchCommercialSummary(period), [period]);
  const registrationsLoad = useCallback(() => fetchCommercialRegistrations(period), [period]);
  const funnelLoad = useCallback(() => fetchCommercialFunnel(month || undefined), [month]);
  const summaryState = useRemote(`${period}:${reload}`, summaryLoad);
  const registrationsState = useRemote(`${period}:${reload}`, registrationsLoad);
  const plansState = useRemote(`plans:${reload}`, fetchCommercialPlans);
  const funnelState = useRemote(`${month}:${reload}`, funnelLoad);
  const summary = summaryState.data, registrations = registrationsState.data;
  const plans = plansState.data, funnel = funnelState.data;
  const options = funnel?.cohorts ?? funnelState.previous?.cohorts ?? [];

  return <>
    <div className="filter-row">
      <span className="filter-label">Período del resumen y altas/bajas</span>
      <PeriodSelector periods={PERIODS} value={period} onChange={setPeriod} />
      <button className="action-button" type="button" onClick={() => setReload(value => value+1)}>Actualizar vista</button>
    </div>
    {summaryState.error && <div className="card" role="alert">{summaryState.error}</div>}
    {!summary && !summaryState.error && <div className="card">Cargando resumen...</div>}
    {summary && <>
      <div className="card">
        <div>Período: {analyticsDate(summary.period.start_date)} al {analyticsDate(summary.period.end_date)}</div>
        <div>Corte de activos, pago y MRR: {analyticsDate(summary.as_of)}</div>
        <AnalyticsMetadata value={summary} />
      </div>
      <div className="kpis">
        <KpiCard label="Descargas" value={count(summary.downloads)} deltaText="en el período" />
        <KpiCard label="Nuevos usuarios" value={count(summary.new_users)} deltaText={delta(summary.deltas.new_users_pct)} deltaClass={deltaClass(summary.deltas.new_users_pct)} />
        <KpiCard label="Bajas" value={count(summary.churned_users)} deltaText={`Tasa de bajas: ${rate(summary.churn_rate)}`} />
        <KpiCard label="Usuarios activos" value={count(summary.active_users)} deltaText={delta(summary.deltas.active_users_pct)} deltaClass={deltaClass(summary.deltas.active_users_pct)} note="Según el corte informado" />
        <KpiCard label="En plan de pago" value={count(summary.paying_users)} deltaText={`${rate(summary.paying_share)} de los activos`} />
        <KpiCard label="MRR" value={summary.mrr_clp == null ? 'Sin datos' : money(summary.mrr_clp)} deltaText={delta(summary.deltas.mrr_pct)} deltaClass={deltaClass(summary.deltas.mrr_pct)} note="CLP · ingreso recurrente mensual" />
      </div>
    </>}
    <div className="grid g2">
      <div className="card">
        <div className="card-title">Altas y bajas de usuarios</div>
        {registrationsState.error && <div role="alert">{registrationsState.error}</div>}
        {registrations ? <>
          <div className="card-sub">{analyticsDate(registrations.period.start_date)} al {analyticsDate(registrations.period.end_date)} · Granularidad: {{ hour: 'horaria', day: 'diaria', week: 'semanal', month: 'mensual' }[registrations.granularity] ?? registrations.granularity}</div>
          {registrations.buckets.length ? <RegistrationsChart labels={registrations.buckets.map(bucket => bucket.label)} signups={registrations.signups} cancellations={registrations.cancellations} /> : <p>Sin datos para este período.</p>}
          {registrations.signups.some(value => value == null) && <p>Hay intervalos sin datos; no se representan como cero.</p>}
          <AnalyticsMetadata value={registrations} />
        </> : !registrationsState.error && 'Cargando altas y bajas...'}
      </div>
      <div className="card">
        <div className="card-title">Mezcla de planes</div>
        <div className="mini-note">La unidad facturable de los planes está pendiente de definición.</div>
        {plansState.error && <div role="alert">{plansState.error}</div>}
        {plans ? <>
          <div className="card-sub">Último snapshot: {analyticsDate(plans.as_of)}</div>
          <PlanMixChart plans={plans.plans} />
          <div style={{ overflowX: 'auto' }}><table className="data">
            <thead><tr><th>Plan</th><th>Cantidad registrada</th><th>Cuota</th><th>Precio CLP</th><th>MRR CLP</th><th>Bajas mensuales</th></tr></thead>
            <tbody>{plans.plans.map(plan => <tr key={plan.plan_code}>
              <td>{plan.name}</td><td>{fmt(plan.users)}</td><td>{rate(plan.share)}</td>
              <td>{moneyOrDash(plan.price_clp)}</td><td>{moneyOrDash(plan.mrr_clp)}</td><td>{percent(plan.monthly_churn)}</td>
            </tr>)}<tr><td>Total</td><td>{fmt(plans.totals.users)}</td><td>{plans.totals.users ? '100%' : 'Sin datos'}</td><td>—</td><td>{money(plans.totals.mrr_clp)}</td><td>{rate(plans.totals.monthly_churn)}</td></tr></tbody>
          </table></div>
          <AnalyticsMetadata value={plans} />
        </> : !plansState.error && 'Cargando planes...'}
      </div>
    </div>
    <div className="card">
      <div className="card-title">Embudo por mes de creación de cuentas</div>
      <label>Grupo mensual <select value={month} onChange={event => setMonth(event.target.value)}>
        <option value="">Selección automática: último seguimiento completo</option>
        {options.map(option => <option key={option.month} value={option.month}>{option.month} — {option.provisional ? 'Provisional' : 'Seguimiento completo'}</option>)}
      </select></label>
      {funnelState.error && <div role="alert">{funnelState.error}</div>}
      {funnel ? <>
        <div className="card-sub">Mes: {funnel.cohort_month ?? 'Sin datos'} · Corte: {analyticsDate(funnel.cutoff_at)}</div>
        <p>{funnel.provisional ? 'Provisional: seguimiento en curso' : 'Seguimiento completo'} · {funnel.observed_accounts} de {funnel.accounts} cuentas completaron sus 30 días.</p>
        <FunnelChart stages={funnel.stages} />
        <div style={{ overflowX: 'auto' }}><table className="data">
          <thead><tr><th>Etapa</th><th>Cuentas</th><th>Respecto de cuentas creadas</th><th>Respecto de etapa anterior</th></tr></thead>
          <tbody>{funnel.stages.map((stage, index) => <tr key={stage.stage}>
            <td>{stage.name}</td><td>{stage.unavailable_reason === 'not_comparable' ? 'No comparable' : count(stage.users)}</td>
            <td>{stage.unavailable_reason === 'not_comparable' ? 'No comparable' : rate(stage.rate_vs_first)}</td>
            <td>{index === 0 ? 'No aplica' : stage.unavailable_reason === 'not_comparable' ? 'No comparable' : rate(stage.rate_vs_previous)}</td>
          </tr>)}</tbody>
        </table></div>
        <AnalyticsMetadata value={funnel} />
        <p>Descargas acumuladas: {count(funnel.downloads)} · Corte: {analyticsDate(funnel.downloads_as_of)} · Cálculo: {analyticsDate(funnel.downloads_computed_at)}</p>
        <div className="mini-note">Descargas {funnel.downloads_data_origin === 'demo' ? 'de demostración' : 'de fuente separada'}. No se calcula conversión hacia cuentas porque no hay vinculación fiable.{funnel.downloads_stale && ' Fuente desactualizada o sin verificación de frescura.'}</div>
      </> : !funnelState.error && 'Cargando embudo...'}
    </div>
  </>;
}
