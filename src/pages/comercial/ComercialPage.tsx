import { useEffect, useState } from 'react';
import {
  fetchCommercialFunnel,
  fetchCommercialPlans,
  fetchCommercialRegistrations,
  fetchCommercialSummary,
  type CommercialFunnel,
  type CommercialPlans,
  type CommercialRegistrations,
  type CommercialSummary,
} from '../../api/commercial';
import { KpiCard } from '../../components/KpiCard';
import { PeriodSelector } from '../../components/PeriodSelector';
import { delta, deltaClass, fmt, money, moneyOrDash, percent } from '../../lib/format';
import { FunnelChart } from './FunnelChart';
import { PlanMixChart } from './PlanMixChart';
import { PLAN_COLORS } from './planColors';
import { RegistrationsChart } from './RegistrationsChart';

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: 'current_week', label: 'Semana en curso' },
  { key: 'last_7_days', label: 'Últimos 7 días' },
  { key: 'current_month', label: 'Mes en curso' },
  { key: 'last_30_days', label: 'Últimos 30 días' },
  { key: 'ytd', label: 'Año en curso' },
  { key: 'last_12_months', label: 'Últimos 12 meses' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

export function ComercialPage() {
  const [period, setPeriod] = useState<PeriodKey>('current_month');
  const [summary, setSummary] = useState<CommercialSummary | null>(null);
  const [registrations, setRegistrations] = useState<CommercialRegistrations | null>(null);
  const [summaryError, setSummaryError] = useState('');

  const [plans, setPlans] = useState<CommercialPlans | null>(null);
  const [funnel, setFunnel] = useState<CommercialFunnel | null>(null);
  const [secondaryError, setSecondaryError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setRegistrations(null);
    setSummaryError('');
    Promise.all([fetchCommercialSummary(period), fetchCommercialRegistrations(period)])
      .then(([summaryData, registrationsData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setRegistrations(registrationsData);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSummaryError(error instanceof Error ? error.message : 'No fue posible cargar el uso comercial.');
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCommercialPlans(), fetchCommercialFunnel()])
      .then(([plansData, funnelData]) => {
        if (cancelled) return;
        setPlans(plansData);
        setFunnel(funnelData);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSecondaryError(error instanceof Error ? error.message : 'No fue posible cargar los planes y el embudo.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? '';

  return (
    <>
      <div className="filter-row">
        <span className="filter-label">Periodo</span>
        <PeriodSelector periods={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="kpis">
        {summaryError && <div className="card">{summaryError}</div>}
        {!summaryError && !summary && <div className="card">Cargando métricas...</div>}
        {summary && (
          <>
            <KpiCard label="Descargas" value={fmt(summary.downloads)} deltaText="en el periodo" />
            <KpiCard
              label="Nuevos usuarios"
              value={fmt(summary.new_users)}
              deltaText={delta(summary.deltas.new_users_pct)}
              deltaClass={deltaClass(summary.deltas.new_users_pct)}
            />
            <KpiCard
              label="Bajas"
              value={fmt(summary.churned_users)}
              deltaText={`churn ${percent(summary.churn_rate)}`}
              deltaClass={summary.churn_rate > 0.03 ? 'down' : ''}
            />
            <KpiCard
              label="Usuarios activos"
              value={fmt(summary.active_users)}
              deltaText={delta(summary.deltas.active_users_pct)}
              deltaClass={deltaClass(summary.deltas.active_users_pct)}
              note="MAU · hoy"
            />
            <KpiCard
              label="En plan de pago"
              value={fmt(summary.paying_users)}
              deltaText={`${percent(summary.paying_share)} de los activos`}
              note="Dorado + Platino + Proveedor"
            />
            <KpiCard
              label="MRR"
              value={money(summary.mrr_clp)}
              deltaText={delta(summary.deltas.mrr_pct)}
              deltaClass={deltaClass(summary.deltas.mrr_pct)}
              note="CLP · suscripciones"
            />
          </>
        )}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Altas y bajas de usuarios</div>
              <div className="card-sub">
                {registrations
                  ? `Nuevos usuarios frente a cuentas dadas de baja · ${periodLabel.toLowerCase()}`
                  : 'Consultando datos del periodo...'}
              </div>
            </div>
            <div className="legend">
              <span className="item"><span className="linekey" style={{ borderColor: 'var(--s1)' }} />Altas</span>
              <span className="item"><span className="linekey" style={{ borderColor: 'var(--s2)' }} />Bajas</span>
            </div>
          </div>
          <div className="chart-wrap">
            {registrations && registrations.buckets.length > 0 && (
              <RegistrationsChart
                labels={registrations.buckets.map(b => b.label)}
                signups={registrations.signups}
                cancellations={registrations.cancellations}
              />
            )}
            {registrations && registrations.buckets.length === 0 && 'No hay registros disponibles para este periodo.'}
            {!registrations && !summaryError && 'Cargando registros...'}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Mezcla de planes</div>
              <div className="card-sub">Usuarios activos por plan · hoy</div>
            </div>
          </div>
          <div className="chart-wrap">
            {plans ? <PlanMixChart plans={plans.plans} /> : secondaryError || 'Cargando planes...'}
          </div>
          {plans && (
            <table className="data" style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th className="num">Usuarios</th>
                  <th className="num">Cuota</th>
                  <th className="num">Precio</th>
                  <th className="num">MRR (CLP)</th>
                  <th className="num">Churn mensual</th>
                </tr>
              </thead>
              <tbody>
                {plans.plans.map(plan => (
                  <tr key={plan.plan_code}>
                    <td>
                      <span className="swatch" style={{ background: PLAN_COLORS[plan.plan_code] ?? '#c9d2de' }} />
                      {plan.name}
                    </td>
                    <td className="num">{fmt(plan.users)}</td>
                    <td className="num">{percent(plan.share)}</td>
                    <td className="num">{moneyOrDash(plan.price_clp)}</td>
                    <td className="num">{moneyOrDash(plan.mrr_clp)}</td>
                    <td className="num">{percent(plan.monthly_churn)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td>Total</td>
                  <td className="num">{fmt(plans.totals.users)}</td>
                  <td className="num">100%</td>
                  <td className="num" />
                  <td className="num">{money(plans.totals.mrr_clp)}</td>
                  <td className="num">{percent(plans.totals.monthly_churn)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Embudo de adquisición</div>
            <div className="card-sub">{funnel ? `Del total acumulado a la fecha · ${funnel.as_of}` : 'Cargando embudo...'}</div>
          </div>
        </div>
        <div className="chart-wrap">{funnel ? <FunnelChart stages={funnel.stages} /> : secondaryError}</div>
      </div>
    </>
  );
}