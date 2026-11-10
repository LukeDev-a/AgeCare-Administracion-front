import { useCallback, useEffect, useState } from 'react';
import { fetchCommercialFunnel, fetchCommercialPlans, fetchCommercialRegistrations, fetchCommercialSummary } from '../../api/commercial';
import { delta, fmt, money, moneyOrDash, percent } from '../../lib/format';
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

  const periodLabel = PERIODS.find(option => option.key === period)?.label;
  const metrics = summary ? [
    { label: 'Descargas', value: count(summary.downloads), detail: 'Durante el período seleccionado' },
    { label: 'Nuevos usuarios', value: count(summary.new_users), detail: delta(summary.deltas.new_users_pct) },
    { label: 'Bajas de usuarios', value: count(summary.churned_users), detail: `Tasa de bajas ${rate(summary.churn_rate)}` },
    { label: 'Usuarios activos', value: count(summary.active_users), detail: delta(summary.deltas.active_users_pct) },
    { label: 'Usuarios en plan de pago', value: count(summary.paying_users), detail: `${rate(summary.paying_share)} de los usuarios activos` },
    { label: 'Ingreso mensual recurrente', value: summary.mrr_clp == null ? 'Sin datos' : money(summary.mrr_clp), detail: `MRR en pesos chilenos · ${delta(summary.deltas.mrr_pct)}` },
  ] : [];

  return <div className="tw:space-y-7 tw:text-sm tw:leading-relaxed tw:text-ink">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
      <div>
        <p className="tw:mb-2 tw:text-xs tw:font-bold tw:tracking-widest tw:text-brand-ink tw:uppercase">Analítica comercial</p>
        <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:sm:text-3xl">Uso comercial</h1>
        <p className="tw:mt-2 tw:max-w-2xl tw:text-base tw:text-muted">Consulta el crecimiento de usuarios, los planes y la evolución hacia el pago.</p>
      </div>
      <button className="tw:inline-flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand" type="button" onClick={() => setReload(value => value + 1)}>
        <span aria-hidden="true">↻</span> Actualizar indicadores
      </button>
    </header>

    <section className={panel} aria-labelledby="commercial-summary-title">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
        <div>
          <h2 id="commercial-summary-title" className={heading}>Resumen del negocio</h2>
          <p className={description}>Elige el período para consultar descargas, nuevos usuarios y bajas.</p>
        </div>
        <label className="tw:grid tw:w-full tw:gap-2 tw:font-semibold tw:sm:w-auto">
          Período de consulta
          <select className={selectStyle} value={period} onChange={event => setPeriod(event.target.value as PeriodKey)}>
            {PERIODS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {summaryState.error && <p role="alert" className={errorStyle}>{summaryState.error}</p>}
      {!summary && !summaryState.error && <p role="status" className={loadingStyle}>Cargando el resumen del negocio…</p>}
      {summary && <>
        <div className="tw:mb-5 tw:mt-6 tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1">
          <span className="tw:rounded-full tw:bg-brand-soft tw:px-3 tw:py-1 tw:font-semibold tw:text-brand-ink">{periodLabel}</span>
          <span className="tw:text-muted">Del {analyticsDate(summary.period.start_date)} al {analyticsDate(summary.period.end_date)}</span>
        </div>
        <div className="tw:grid tw:gap-4 tw:md:grid-cols-3">
          {metrics.slice(0, 3).map(metric => <Metric key={metric.label} {...metric} />)}
        </div>
        <div className="tw:mb-4 tw:mt-7 tw:flex tw:flex-wrap tw:items-baseline tw:justify-between tw:gap-2">
          <h3 className="tw:text-base tw:font-semibold">Usuarios e ingresos al cierre disponible</h3>
          <p className="tw:text-muted">{summary.as_of ? `Datos hasta el ${analyticsDate(summary.as_of)}` : 'Fecha de corte aún no disponible'}</p>
        </div>
        <div className="tw:grid tw:gap-4 tw:md:grid-cols-3">
          {metrics.slice(3).map(metric => <Metric key={metric.label} {...metric} />)}
        </div>
        <AnalyticsMetadata value={summary} />
      </>}
    </section>

    <section className={panel} aria-labelledby="commercial-registrations-title">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
        <div><h2 id="commercial-registrations-title" className={heading}>Altas y bajas de usuarios</h2>
          <p className={description}>Compara cuántas cuentas se incorporan y cuántas se dan de baja.</p></div>
        <div className="tw:flex tw:gap-4 tw:rounded-xl tw:bg-canvas tw:px-4 tw:py-2 tw:font-medium">
          <span className="tw:flex tw:items-center tw:gap-2"><span className="tw:h-2.5 tw:w-2.5 tw:rounded-full tw:bg-[#2a78d6]" />Altas</span>
          <span className="tw:flex tw:items-center tw:gap-2"><span className="tw:h-2.5 tw:w-2.5 tw:rounded-full tw:bg-[#eb6834]" />Bajas</span>
        </div>
      </div>
      {registrationsState.error && <p role="alert" className={errorStyle}>{registrationsState.error}</p>}
      {registrations ? <>
        <p className="tw:mb-5 tw:mt-4 tw:text-muted">Del {analyticsDate(registrations.period.start_date)} al {analyticsDate(registrations.period.end_date)} · Vista {{ hour: 'por hora', day: 'por día', week: 'por semana', month: 'por mes' }[registrations.granularity] ?? registrations.granularity}</p>
        {registrations.buckets.length ? <RegistrationsChart labels={registrations.buckets.map(bucket => bucket.label)} signups={registrations.signups} cancellations={registrations.cancellations} /> : <p className={loadingStyle}>Sin datos para este período.</p>}
        {(registrations.signups.some(value => value == null) || registrations.cancellations.some(value => value == null)) && <p className="tw:mt-4 tw:text-muted">Los espacios del gráfico corresponden a intervalos sin información disponible.</p>}
        <AnalyticsMetadata value={registrations} />
      </> : !registrationsState.error && <p role="status" className={loadingStyle}>Cargando altas y bajas…</p>}
    </section>

    <section className={panel} aria-labelledby="commercial-plans-title">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
        <div><h2 id="commercial-plans-title" className={heading}>Planes e ingresos mensuales</h2>
          <p className={description}>Distribución de los planes y sus ingresos recurrentes, según el último registro disponible.</p></div>
        {plans && <p className="tw:rounded-xl tw:bg-canvas tw:px-4 tw:py-2 tw:text-muted">Registro del {analyticsDate(plans.as_of)}</p>}
      </div>
      {plansState.error && <p role="alert" className={errorStyle}>{plansState.error}</p>}
      {plans ? <>
        <PlanMixChart plans={plans.plans} />
        <div className={tableScroll}><table className={tableStyle}>
          <caption className="tw:sr-only">Distribución de planes e ingresos mensuales en pesos chilenos</caption>
          <thead><tr><th>Plan</th><th>Cantidad registrada</th><th>Participación</th><th>Precio del plan</th><th>Ingreso mensual</th><th>Bajas mensuales</th></tr></thead>
          <tbody>{plans.plans.map(plan => <tr key={plan.plan_code}>
            <td className="tw:font-semibold">{plan.name}</td><td>{fmt(plan.users)}</td><td>{rate(plan.share)}</td>
            <td>{moneyOrDash(plan.price_clp)}</td><td>{moneyOrDash(plan.mrr_clp)}</td><td>{percent(plan.monthly_churn)}</td>
          </tr>)}</tbody>
          <tfoot><tr><td>Total</td><td>{fmt(plans.totals.users)}</td><td>{plans.totals.users ? '100%' : 'Sin datos'}</td><td>—</td><td>{money(plans.totals.mrr_clp)}</td><td>{rate(plans.totals.monthly_churn)}</td></tr></tfoot>
        </table></div>
        <p className="tw:mt-4 tw:text-muted">Importes en pesos chilenos (CLP). La unidad facturable de los planes está pendiente de definición.</p>
        <AnalyticsMetadata value={plans} />
      </> : !plansState.error && <p role="status" className={loadingStyle}>Cargando planes e ingresos…</p>}
    </section>

    <section className={panel} aria-labelledby="commercial-funnel-title">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5">
        <div><h2 id="commercial-funnel-title" className={heading}>De nuevas cuentas a usuarios de pago</h2>
          <p className={description}>Sigue a las cuentas creadas en un mismo mes durante sus primeros 30 días.</p></div>
        <label className="tw:grid tw:w-full tw:gap-2 tw:font-semibold tw:sm:w-auto">Mes de creación de las cuentas
          <select className={selectStyle} value={month} onChange={event => setMonth(event.target.value)}>
            <option value="">Último grupo con seguimiento completo</option>
            {options.map(option => <option key={option.month} value={option.month}>{cohortLabel(option.month)} — {option.provisional ? 'En seguimiento' : 'Completo'}</option>)}
          </select>
        </label>
      </div>
      {funnelState.error && <p role="alert" className={errorStyle}>{funnelState.error}</p>}
      {funnel ? <>
        <div className="tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:rounded-xl tw:bg-canvas tw:p-4">
          <span className="tw:rounded-full tw:bg-brand-soft tw:px-3 tw:py-1 tw:font-semibold tw:text-brand-ink">{funnel.cohort_month ? cohortLabel(funnel.cohort_month) : 'Mes sin datos'}</span>
          <span className="tw:font-semibold">{funnel.provisional ? 'Provisional: seguimiento en curso' : 'Seguimiento completo'}</span>
          <span className="tw:text-muted">{fmt(funnel.observed_accounts)} de {fmt(funnel.accounts)} cuentas completaron sus 30 días.</span>
        </div>
        <p className="tw:mb-4 tw:text-muted">{funnel.cutoff_at ? `Actividad observada hasta el ${analyticsDate(funnel.cutoff_at)}` : 'Fecha de seguimiento aún no disponible'}</p>
        <FunnelChart stages={funnel.stages} />
        <div className={tableScroll}><table className={tableStyle}>
          <caption className="tw:sr-only">Conversión de cuentas creadas, activas y de pago</caption>
          <thead><tr><th>Etapa</th><th>Cuentas</th><th>Respecto de cuentas creadas</th><th>Respecto de etapa anterior</th></tr></thead>
          <tbody>{funnel.stages.map((stage, index) => <tr key={stage.stage}>
            <td className="tw:font-semibold">{stage.name}</td><td>{stage.unavailable_reason === 'not_comparable' ? 'No comparable' : count(stage.users)}</td>
            <td>{stage.unavailable_reason === 'not_comparable' ? 'No comparable' : rate(stage.rate_vs_first)}</td>
            <td>{index === 0 ? 'No aplica' : stage.unavailable_reason === 'not_comparable' ? 'No comparable' : rate(stage.rate_vs_previous)}</td>
          </tr>)}</tbody>
        </table></div>
        <AnalyticsMetadata value={funnel} />
        <aside className="tw:mt-6 tw:rounded-xl tw:bg-canvas tw:p-4 tw:sm:p-5" aria-label="Descargas acumuladas">
          <h3 className="tw:text-base tw:font-semibold">Descargas acumuladas</h3>
          <p className="tw:my-2 tw:text-2xl tw:font-bold tw:tabular-nums">{count(funnel.downloads)}</p>
          <p className="tw:text-muted">Se muestran por separado porque aún no se pueden vincular de forma fiable con las cuentas creadas.</p>
          <p className="tw:mt-3 tw:text-muted">{funnel.downloads_as_of ? `Datos hasta el ${analyticsDate(funnel.downloads_as_of)}` : 'Fecha de corte aún no disponible'}</p>
          <p className="tw:mt-1 tw:text-muted">{funnel.downloads_computed_at ? `Última actualización ${analyticsDate(funnel.downloads_computed_at)}` : 'Fecha de actualización aún no disponible'}</p>
          {funnel.downloads_stale && <p role="status" className="tw:mt-3 tw:rounded-lg tw:bg-warning-bg tw:p-3">La información de descargas está desactualizada o pendiente de verificación.</p>}
        </aside>
      </> : !funnelState.error && <p role="status" className={loadingStyle}>Cargando el seguimiento de cuentas…</p>}
    </section>
  </div>;
}

const panel = 'tw:min-w-0 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:shadow-sm tw:sm:p-7';
const heading = 'tw:text-lg tw:font-bold tw:tracking-tight tw:sm:text-xl';
const description = 'tw:mt-2 tw:max-w-2xl tw:text-sm tw:leading-relaxed tw:text-muted';
const selectStyle = 'tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:font-medium tw:text-ink tw:sm:max-w-80 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
const loadingStyle = 'tw:my-6 tw:rounded-xl tw:bg-canvas tw:p-5 tw:text-muted';
const errorStyle = 'tw:my-5 tw:rounded-xl tw:bg-warning-bg tw:p-4';
const tableScroll = 'tw:mt-4 tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke';
const tableStyle = 'tw:w-full tw:min-w-[620px] tw:border-collapse tw:text-left tw:text-sm tw:tabular-nums tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-3 tw:[&_th]:font-semibold tw:[&_th]:text-muted tw:[&_td]:border-0 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-4 tw:[&_tfoot]:bg-canvas tw:[&_tfoot]:font-bold';

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5">
    <p className="tw:font-medium tw:text-muted">{label}</p>
    <p className="tw:my-3 tw:break-words tw:text-3xl tw:leading-tight tw:font-bold tw:tracking-tight tw:tabular-nums">{value}</p>
    <p className="tw:text-sm tw:leading-relaxed tw:text-muted">{detail}</p>
  </div>;
}

function cohortLabel(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return month;
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
}
