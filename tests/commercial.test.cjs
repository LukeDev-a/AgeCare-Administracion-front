const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}

test('analítica usa cliente protegido y selecciona cohorte sin perder errores de API', async () => {
  const calls = [];
  const api = load('src/api/commercial.ts', { './client': { apiFetch: async path => {
    calls.push(path);
    return new Response(JSON.stringify(path.includes('cohort_month=mal')
      ? { error: { message: 'Mes no admitido' } } : { stages: [] }), { status: path.includes('cohort_month=mal') ? 422 : 200 });
  } } });
  await api.fetchCommercialSummary('today');
  await api.fetchCommercialRegistrations('last_7_days');
  await api.fetchCommercialPlans();
  await api.fetchCommercialFunnel('2026-09');
  assert.equal(calls[3], '/metrics/commercial/funnel?cohort_month=2026-09');
  assert.equal(calls[0], '/metrics/commercial/summary?period=today');
  await assert.rejects(api.fetchCommercialFunnel('mal'), /Mes no admitido/);
});

test('gráfico de altas conserva null y cero, y rechaza series desalineadas', () => {
  const charts = new Proxy({}, { get: (_, name) => name });
  const { RegistrationsChart } = load('src/pages/comercial/RegistrationsChart.tsx', { recharts: charts });
  const tree = RegistrationsChart({ labels: ['A', 'B'], signups: [null, 0], cancellations: [2, 0] });
  const data = tree.props.children.props.data;
  assert.equal(data[0].Altas, null);
  assert.equal(data[1].Altas, 0);
  const invalid = renderToStaticMarkup(React.createElement(RegistrationsChart, {
    labels: ['A'], signups: [], cancellations: [0],
  }));
  assert.match(invalid, /series desalineadas/);
});

test('actualización legible conserva avisos de antigüedad sin mostrar origen ni detalle técnico', () => {
  const { AnalyticsMetadata, analyticsDate } = load('src/pages/comercial/AnalyticsMetadata.tsx');
  assert.equal(analyticsDate('2026-10-01'), '01/10/2026');
  const html = renderToStaticMarkup(React.createElement(AnalyticsMetadata, { value: {
    data_origin: 'demo', computed_at: null,
    freshness: { calculation_stale: true, sources: [{ name: 'payments', missing: false, stale: true, available_through: null }] },
  } }));
  assert.match(html, /Última actualización de los indicadores/);
  assert.match(html, /Fecha aún no disponible/);
  assert.match(html, /La última actualización tiene más de 24 horas/);
  assert.match(html, /Parte de la información lleva más de 24 horas/);
  assert.doesNotMatch(html, /Datos de demostración|Origen de datos|Fuente pagos|Calculado:/);
  const missing = renderToStaticMarkup(React.createElement(AnalyticsMetadata, { value: {
    data_origin: 'real', computed_at: '2026-10-01T12:30:00Z',
    freshness: { calculation_stale: false, sources: [{ name: 'daily', missing: true, stale: false }] },
  } }));
  assert.match(missing, /Falta información para completar algunos indicadores/);
  assert.match(missing, /hora de Santiago/);
  assert.doesNotMatch(missing, /Fuente indicadores diarios|Datos de fuentes reales/);
});

test('planes preservan un precio de cero y distinguen ausencia', () => {
  const { moneyOrDash } = load('src/lib/format.ts');
  assert.equal(moneyOrDash(0), '$0');
  assert.equal(moneyOrDash(null), '—');
});

test('pantalla muestra ambas conversiones y separa descargas, sin inventar unidad facturable', async () => {
  const states = [], effects = [];
  let cursor = 0;
  const metadata = { data_origin: 'demo', computed_at: null, freshness: null };
  const format = load('src/lib/format.ts');
  const meta = load('src/pages/comercial/AnalyticsMetadata.tsx');
  const blank = () => null;
  const api = {
    fetchCommercialSummary: async () => ({ ...metadata, period: { start_date: '2026-10-01', end_date: '2026-10-26' }, deltas: {} }),
    fetchCommercialRegistrations: async () => ({ ...metadata, period: {}, buckets: [], signups: [], cancellations: [] }),
    fetchCommercialPlans: async () => ({ ...metadata, as_of: '2026-10-01', plans: [], totals: { users: 0, mrr_clp: 0, monthly_churn: null } }),
    fetchCommercialFunnel: async () => ({ ...metadata, cohorts: [], cohort_month: '2026-09', provisional: true,
      observed_accounts: 2, accounts: 4, downloads: 20, downloads_data_origin: 'demo',
      stages: [ { stage: 'accounts', name: 'Cuentas creadas', users: 4, rate_vs_first: 1 },
        { stage: 'active', name: 'Cuentas activas', users: null, rate_vs_first: null, rate_vs_previous: null, unavailable_reason: 'not_comparable' } ],
    }),
  };
  const { ComercialPage } = load('src/pages/comercial/ComercialPage.tsx', {
    react: {
      useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial;
        return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
      useCallback: callback => callback, useEffect: effect => effects.push(effect),
    },
    '../../api/commercial': api, '../../lib/format': format,
    './AnalyticsMetadata': meta, '../../components/KpiCard': { KpiCard: blank },
    '../../components/PeriodSelector': { PeriodSelector: blank }, './FunnelChart': { FunnelChart: blank },
    './PlanMixChart': { PlanMixChart: blank }, './RegistrationsChart': { RegistrationsChart: blank },
  });
  ComercialPage();
  effects.splice(0).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  cursor = 0;
  const html = renderToStaticMarkup(ComercialPage());
  assert.match(html, /Respecto de cuentas creadas/);
  assert.match(html, /Respecto de etapa anterior/);
  assert.match(html, /No comparable/);
  assert.match(html, /Provisional: seguimiento en curso/);
  assert.match(html, /Descargas acumuladas/);
  assert.match(html, />20</);
  assert.match(html, /Período de consulta/);
  assert.match(html, /Usuarios e ingresos al cierre disponible/);
  assert.doesNotMatch(html, /Origen de datos|Fuente indicadores diarios|Datos de demostración/);
  assert.match(html, /unidad facturable de los planes está pendiente/);
});
