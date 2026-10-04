import { useEffect, useState } from 'react';
import {
  fetchFeatureAdoption,
  fetchFeatureAlerts,
  fetchTopFeatures,
  type FeatureAdoption,
  type FeatureAlerts,
  type TopFeatures,
} from '../../api/features';
import { PeriodSelector } from '../../components/PeriodSelector';
import { FEATURE_ROLE_COLORS, featureRoleName } from '../../lib/featureRoleMeta';
import { percent } from '../../lib/format';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapTable } from './HeatmapTable';

const PERIODS = [
  { key: 7, label: 'Últimos 7 días' },
  { key: 30, label: 'Últimos 30 días' },
  { key: 90, label: 'Últimos 90 días' },
] as const;

export function FuncionalPage() {
  const [days, setDays] = useState<number>(30);
  const [adoption, setAdoption] = useState<FeatureAdoption | null>(null);
  const [top, setTop] = useState<TopFeatures | null>(null);
  const [alerts, setAlerts] = useState<FeatureAlerts | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([fetchFeatureAdoption(days), fetchTopFeatures(days), fetchFeatureAlerts(days)])
      .then(([adoptionData, topData, alertsData]) => {
        if (cancelled) return;
        setAdoption(adoptionData);
        setTop(topData);
        setAlerts(alertsData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el uso por funcionalidad.');
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <>
      <div className="filter-row">
        <span className="filter-label">Periodo</span>
        <PeriodSelector periods={PERIODS} value={days} onChange={setDays} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Adopción de funcionalidades por perfil</div>
              <div className="card-sub">
                {adoption
                  ? `% de usuarios activos del perfil que usaron la función · últimos ${adoption.days} días`
                  : '% de usuarios activos del perfil que usaron la función · últimos 30 días'}
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {error && error}
            {!error && !adoption && 'Cargando adopción...'}
            {adoption && <HeatmapTable data={adoption} />}
          </div>
          {adoption && <HeatmapLegend />}
        </div>

        <div>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Más usadas por perfil</div>
                <div className="card-sub">Función nº 1 de cada rol · ventana seleccionada</div>
              </div>
            </div>
            <ul className="flag-list">
              {!error && !top && <li>Cargando funcionalidades...</li>}
              {error && <li>{error}</li>}
              {top?.top_by_role.map(item => {
                const feature = item.features[0];
                if (!feature) {
                  return (
                    <li key={item.role}>
                      <span className="fl-t">{featureRoleName(item.role)}</span>
                      <div className="fl-s">Sin datos de adopción.</div>
                    </li>
                  );
                }
                return (
                  <li key={item.role}>
                    <span className="swatch" style={{ background: FEATURE_ROLE_COLORS[item.role], marginTop: 4 }} />
                    <div>
                      <div className="fl-t">
                        {featureRoleName(item.role)} → {feature.name} ({percent(feature.adoption)})
                      </div>
                      <div className="fl-s">Mayor adopción registrada para este perfil en la ventana consultada.</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Alertas de adopción</div>
                <div className="card-sub">
                  {alerts ? `Funciones infrautilizadas · umbral ${percent(alerts.threshold)}` : 'Funciones infrautilizadas · últimos 30 días'}
                </div>
              </div>
            </div>
            <ul className="flag-list">
              {!error && !alerts && <li>Cargando alertas...</li>}
              {error && <li>{error}</li>}
              {alerts && alerts.alerts.length === 0 && <li>No hay alertas de adopción.</li>}
              {alerts?.alerts.slice(0, 6).map((alert, index) => {
                const values = alert.adoption.map(value => percent(value)).join(' / ');
                const roles = alert.roles.map(role => featureRoleName(role)).join(' / ');
                return (
                  <li key={index}>
                    <span className={`chip ${alert.expected_low ? 'neutral' : 'serious'}`}>▼ {values}</span>
                    <div>
                      <div className="fl-t">
                        {alert.name} ({roles})
                      </div>
                      <div className="fl-s">{alert.note || 'Función con adopción inferior al umbral configurado.'}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}