const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
class FormValues { constructor(values) { this.values = values; } get(name) { return this.values[name]; } }
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, FormData: FormValues, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const format = load('src/lib/format.ts');
const dates = load('src/lib/usersSupportMeta.ts');
const heat = load('src/lib/heatmap.ts');
const calculations = load('src/lib/featureCalculationMeta.ts', { './format': format });
const roleMeta = { featureRoleName: value => ({ family: 'Familiar', elder: 'Adulto mayor' }[value] ?? value), FEATURE_ROLE_COLORS: { family: 'blue', elder: 'green' } };
const matrix = load('src/pages/funcional/HeatmapTable.tsx', { '../../lib/featureRoleMeta': roleMeta, '../../lib/heatmap': heat, '../../lib/featureCalculationMeta': calculations });
const alertList = load('src/pages/funcional/FeatureAlertList.tsx', { '../../lib/featureRoleMeta': roleMeta, '../../lib/featureCalculationMeta': calculations });
const legend = load('src/pages/funcional/HeatmapLegend.tsx', { '../../lib/heatmap': heat });
const at = '2026-10-27T15:00:00Z';
const example = { feature_key: 'checkin', name: 'Estado de ánimo', adoption: [null, 0], calculation_details: [
  { role: 'family', applicable: false, status: 'not_applicable', reason: 'not_applicable', users: null, active_users: null },
  { role: 'elder', applicable: true, status: 'calculated', reason: null, users: 0, active_users: 100 },
] };

test('servicios usan rutas existentes, defaults y parámetros de ranking/umbral', async () => {
  const paths = [];
  const api = load('src/api/features.ts', { './client': { apiFetch: async path => { paths.push(path); return new Response('{}'); } } });
  await api.fetchFeatureAdoption(30); await api.fetchTopFeatures(30); await api.fetchFeatureAlerts(30);
  await api.fetchTopFeatures(90, 5); await api.fetchFeatureAlerts(7, .5);
  assert.deepEqual(paths, ['/metrics/features/adoption?days=30', '/metrics/features/top?days=30&limit=1',
    '/metrics/features/alerts?days=30&threshold=0.15', '/metrics/features/top?days=90&limit=5', '/metrics/features/alerts?days=7&threshold=0.5']);
});

test('rechazos muestran el mensaje real de la API', async () => {
  const api = load('src/api/features.ts', { './client': { apiFetch: async () => new Response(
    JSON.stringify({ error: { message: 'El umbral debe estar entre 0.01 y 0.5.' } }), { status: 422 }) } });
  await assert.rejects(api.fetchFeatureAlerts(30, .9), /El umbral debe/);
});

test('matriz conserva null como No aplica y cero numérico; rechaza filas desalineadas', () => {
  const data = { days: 30, roles: ['family', 'elder'], features: [example], computed_at: at };
  const html = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data }));
  assert.match(html, /No aplica/); assert.match(html, />0%</);
  const invalid = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data: { ...data, features: [{ ...example, adoption: [null] }] } }));
  assert.match(invalid, /no coinciden con los perfiles/);
  const empty = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data: { ...data, features: [] } }));
  assert.match(empty, /Sin datos de adopción/);
});

test('alertas conservan todos los registros, contexto y asociación perfil/porcentaje', () => {
  const alerts = Array.from({ length: 8 }, (_, index) => ({ feature_key: String(index), name: `Función ${index}`,
    roles: ['family', 'elder'], adoption: [.03, .1], expected_low: false, note: 'Contexto informado' }));
  const html = renderToStaticMarkup(React.createElement(alertList.FeatureAlertList, { alerts, expected: false }));
  assert.match(html, /Función 7/); assert.match(html, /Familiar: 3%/); assert.match(html, /Adulto mayor: 10%/);
  assert.match(html, /Contexto informado/); assert.match(html, /Revisar uso bajo/);
  const expected = renderToStaticMarkup(React.createElement(alertList.FeatureAlertList, { alerts: [alerts[0]], expected: true }));
  assert.match(expected, /Uso bajo esperado/);
  const invalid = renderToStaticMarkup(React.createElement(alertList.FeatureAlertList, { alerts: [{ ...alerts[0], adoption: [0] }], expected: false }));
  assert.match(invalid, /no coinciden con los perfiles/);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function section(tree, title) {
  return find(tree, node => node.type === 'section' && node.props['aria-label'] === title);
}
function harness(overrides = {}) {
  const state = [], calls = { adoption: [], top: [], alerts: [] };
  let cursor = 0, pending = [];
  const same = (a, b) => a && a.length === b.length && a.every((value, index) => value === b[index]);
  const hooks = {
    useState: initial => { const index = cursor++; if (!(index in state)) state[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [state[index].value, next => { state[index].value = typeof next === 'function' ? next(state[index].value) : next; }]; },
    useCallback: (callback, deps) => { const index = cursor++; if (!same(state[index]?.deps, deps)) state[index] = { deps, value: callback }; return state[index].value; },
    useEffect: (effect, deps) => { const index = cursor++; if (!same(state[index]?.deps, deps)) pending.push(() => { state[index]?.cleanup?.(); state[index] = { deps, cleanup: effect() }; }); },
  };
  const api = {
    fetchFeatureAdoption: days => { calls.adoption.push(days); return overrides.adoption ? overrides.adoption(days) : Promise.resolve({ days, computed_at: at, roles: ['family', 'elder'], features: [example] }); },
    fetchTopFeatures: (days, limit) => { calls.top.push({ days, limit }); return overrides.top ? overrides.top(days, limit) : Promise.resolve({ computed_at: at, calculable_only: true,
      top_by_role: [{ role: 'family', features: Array.from({ length: limit }, (_, index) => ({ feature_key: 'rank'+index, name: 'Ranking '+index, adoption: (5-index)/10 })) }] }); },
    fetchFeatureAlerts: (days, threshold) => { calls.alerts.push({ days, threshold }); return overrides.alerts ? overrides.alerts(days, threshold) : Promise.resolve({ computed_at: at, threshold, calculable_only: true,
      alerts: [{ feature_key: 'sos', name: 'SOS', roles: ['elder'], adoption: [.01], expected_low: true, note: 'Emergencia' },
        { feature_key: 'market', name: 'Marketplace', roles: ['family'], adoption: [.02], expected_low: false, note: null }] }); },
  };
  const { FuncionalPage } = load('src/pages/funcional/FuncionalPage.tsx', { react: hooks, '../../api/features': api,
    '../../components/PeriodSelector': { PeriodSelector: () => null }, '../../lib/featureRoleMeta': roleMeta,
    '../../lib/format': format, '../../lib/usersSupportMeta': dates, '../../lib/featureCalculationMeta': calculations, './HeatmapTable': matrix,
    './HeatmapLegend': legend, './FeatureAlertList': alertList,
  });
  return { calls, render() { cursor = 0; pending = []; return FuncionalPage(); },
    async flush() { pending.forEach(run => run()); await new Promise(resolve => setImmediate(resolve)); } };
}

test('ranking y alertas cambian independientemente, sin limitar el ranking al primer resultado', async () => {
  const h = harness(); h.render(); await h.flush();
  let tree = h.render();
  find(section(tree, 'Más utilizadas por perfil'), node => node.type === 'select').props.onChange({ target: { value: '5' } });
  h.render(); await h.flush(); tree = h.render();
  const ranking = renderToStaticMarkup(section(tree, 'Más utilizadas por perfil'));
  assert.match(ranking, /Ranking 4/); assert.ok(ranking.indexOf('Ranking 0') < ranking.indexOf('Ranking 4'));
  find(section(tree, 'Alertas de uso bajo'), node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { threshold: '50' } });
  h.render(); await h.flush(); tree = h.render();
  assert.deepEqual(h.calls.adoption, [30]); assert.equal(h.calls.top.length, 2);
  assert.equal(h.calls.top[1].limit, 5); assert.equal(h.calls.alerts[1].threshold, .5);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Por debajo de 50%/); assert.match(html, /Uso bajo esperado/); assert.match(html, /Revisar uso bajo/);
  assert.match(html, /Última actualización de los indicadores/);
});

test('cambiar período ignora respuestas anteriores y consulta las tres secciones', async () => {
  let resolveOld;
  const h = harness({ adoption: days => days === 30 ? new Promise(resolve => { resolveOld = resolve; })
    : Promise.resolve({ days, roles: [], features: [], computed_at: at }) });
  h.render(); await h.flush();
  find(h.render(), node => node.type === 'select' && node.props['aria-label'] === 'Período de consulta').props.onChange({ target: { value: '90' } });
  h.render(); await h.flush();
  resolveOld({ days: 30, roles: [], features: [], computed_at: at });
  await new Promise(resolve => setImmediate(resolve));
  const html = renderToStaticMarkup(section(h.render(), 'Adopción de funcionalidades por perfil'));
  assert.match(html, /Últimos 90 días/); assert.doesNotMatch(html, /Últimos 30 días/);
  assert.deepEqual(h.calls.adoption, [30, 90]); assert.equal(h.calls.top[1].days, 90); assert.equal(h.calls.alerts[1].days, 90);
});

test('un fallo de ranking no oculta la matriz ni las alertas', async () => {
  const h = harness({ top: () => Promise.reject(new Error('Ranking no disponible')) });
  h.render(); await h.flush();
  const html = renderToStaticMarkup(h.render());
  assert.match(html, /Ranking no disponible/); assert.match(html, /Estado de ánimo/); assert.match(html, /SOS/);
  assert.match(html, /No calculable indica/);
});

test('un umbral fuera de rango no envía nuevas consultas', async () => {
  const h = harness(); h.render(); await h.flush();
  find(section(h.render(), 'Alertas de uso bajo'), node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { threshold: '51' } });
  h.render(); await h.flush();
  assert.equal(h.calls.alerts.length, 1);
});

test('No calculable conserva su causa y no se confunde con No aplica o cero', () => {
  const data = { roles: ['family', 'elder', 'doctor'], features: [{ ...example, adoption: [null, null, 0], calculation_details: [
    example.calculation_details[0],
    { role: 'elder', applicable: true, status: 'not_calculable', reason: 'missing_usage', users: null, active_users: 100 },
    { role: 'doctor', applicable: true, status: 'calculated', reason: null, users: 0, active_users: 100 },
  ] }] };
  const html = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data }));
  assert.match(html, /No aplica/); assert.match(html, /No calculable/); assert.match(html, />0%</);
  assert.match(html, /Faltan datos de uso/);
  assert.match(calculations.featureCalculationReason('missing_active_users'), /Faltan datos de usuarios activos/);
  assert.match(calculations.featureCalculationReason('no_active_users'), /No hay usuarios activos/);
  assert.match(calculations.featureCalculationReason('invalid_data'), /inconsistentes/);
  const invalid = { ...data, features: [{ ...data.features[0], calculation_details: [...data.features[0].calculation_details].reverse() }] };
  assert.match(renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data: invalid })), /no coinciden con los perfiles/);
});

test('porcentajes positivos pequeños no se presentan como cero', () => {
  assert.equal(calculations.adoptionPercent(0), '0%');
  assert.equal(calculations.adoptionPercent(.000001), '<0,1 %');
  const data = { roles: ['elder'], features: [{ feature_key: 'tiny', name: 'Uso pequeño', adoption: [.000001], calculation_details: [
    { role: 'elder', applicable: true, status: 'calculated', reason: null, users: 1, active_users: 1000000 },
  ] }] };
  const html = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data }));
  assert.match(html, /&lt;0,1 %/); assert.doesNotMatch(html, />0%</);
});

test('una API anterior no presenta ranking o alertas como calculables verificados', async () => {
  const h = harness({
    adoption: () => Promise.resolve({ days: 30, computed_at: at, roles: ['family'], features: [{ feature_key: 'old', name: 'Antigua', adoption: [null] }] }),
    top: () => Promise.resolve({ computed_at: at, top_by_role: [{ role: 'family', features: [{ feature_key: 'old', name: 'Ranking falso antiguo', adoption: 0 }] }] }),
    alerts: () => Promise.resolve({ computed_at: at, threshold: .15, alerts: [{ feature_key: 'old', name: 'Alerta falsa antigua', roles: ['family'], adoption: [0], expected_low: false }] }),
  });
  h.render(); await h.flush();
  const html = renderToStaticMarkup(h.render());
  assert.match(html, /El estado del cálculo no está disponible/);
  assert.match(html, /Actualiza la API/);
  assert.doesNotMatch(html, /Ranking falso antiguo|Alerta falsa antigua/);
  assert.doesNotMatch(html, /0 %: cálculo válido/);
  const cell = renderToStaticMarkup(React.createElement(matrix.HeatmapTable, { data: { roles: ['family'], features: [{ feature_key: 'old', name: 'Antigua', adoption: [null] }] } }));
  assert.match(cell, /Sin datos/); assert.doesNotMatch(cell, /No aplica/);
});

test('el cero calculable sigue visible en ranking y alerta validada', async () => {
  const h = harness({ top: () => Promise.resolve({ computed_at: at, calculable_only: true, top_by_role: [
    { role: 'elder', features: [{ feature_key: 'zero', name: 'Cero válido', adoption: 0 }] },
  ] }), alerts: () => Promise.resolve({ computed_at: at, threshold: .15, calculable_only: true, alerts: [
    { feature_key: 'zero', name: 'Cero válido', roles: ['elder'], adoption: [0], expected_low: false },
  ] }) });
  h.render(); await h.flush();
  const tree = h.render();
  assert.match(renderToStaticMarkup(section(tree, 'Más utilizadas por perfil')), /Cero válido: 0%/);
  assert.match(renderToStaticMarkup(section(tree, 'Alertas de uso bajo')), /Adulto mayor: 0%/);
});

test('las secciones conservan ranking y umbral sin repetir consultas al navegar', async () => {
  const h = harness(); h.render(); await h.flush();
  let tree = h.render();
  assert.equal(find(tree, node => node.props?.id === 'features-comparison').props.hidden, false);
  find(section(tree, 'Más utilizadas por perfil'), node => node.type === 'select').props.onChange({ target: { value: '3' } });
  h.render(); await h.flush(); tree = h.render();
  find(section(tree, 'Alertas de uso bajo'), node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { threshold: '25' } });
  h.render(); await h.flush(); tree = h.render();
  for (const selected of ['ranking', 'alerts', 'comparison']) {
    find(tree, node => node.type === 'button' && node.props['aria-controls'] === `features-${selected}`).props.onClick();
    tree = h.render(); await h.flush();
    assert.equal(find(tree, node => node.props?.id === `features-${selected}`).props.hidden, false);
    for (const other of ['ranking', 'alerts', 'comparison'].filter(key => key !== selected)) {
      assert.equal(find(tree, node => node.props?.id === `features-${other}`).props.hidden, true);
    }
  }
  assert.equal(find(section(tree, 'Más utilizadas por perfil'), node => node.type === 'select').props.value, 3);
  assert.match(renderToStaticMarkup(section(tree, 'Alertas de uso bajo')), /Por debajo de 25%/);
  assert.deepEqual(h.calls.adoption, [30]);
  assert.equal(h.calls.top.length, 2);
  assert.equal(h.calls.alerts.length, 2);
});
