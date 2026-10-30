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
const roles = { ROLE_META: { family: { name: 'Familiares', color: 'blue' }, elder: { name: 'Adultos mayores', color: 'green' } },
  roleLabel: role => ({ family: 'Familiares', elder: 'Adultos mayores' }[role] ?? role) };
const at = '2026-10-27T15:00:00Z';
const roleRow = { role: 'family', active_users: 12, growth_8w: .1, sessions_per_week: 2.5, avg_session_seconds: 90, retention_30d: .8 };
const baseSupport = { open: 4, in_progress: 2, waiting_user: 1, resolved_30d: 8,
  first_response_hours_avg: 0, csat_avg: null, csat_count: 0, computed_at: at,
  deltas: { open_wow: 999999, resolved_mom_pct: .2, first_response_mom_hours: null } };
const baseCategories = { days: 30, total: 6, categories: [
  { category: 'other', name: 'Primera categoría', count: 4, share: .6667 },
  { category: 'billing_plans', name: 'Segunda categoría', count: 2, share: .3333 },
] };

test('servicios conservan rutas y valores predeterminados y aceptan parámetros de consulta', async () => {
  const paths = [];
  const api = load('src/api/usersSupport.ts', { './client': { apiFetch: async path => {
    paths.push(path); return new Response('{}');
  } } });
  await api.fetchRolesSummary(); await api.fetchRolesWeekly(); await api.fetchTicketsByCategory();
  await api.fetchRolesSummary(90); await api.fetchRolesWeekly(26); await api.fetchTicketsByCategory(365);
  assert.deepEqual(paths, ['/metrics/roles/summary?days=30', '/metrics/roles/weekly-active?weeks=8',
    '/support/tickets/by-category?days=30', '/metrics/roles/summary?days=90', '/metrics/roles/weekly-active?weeks=26',
    '/support/tickets/by-category?days=365']);
});

test('un rechazo conserva el mensaje de la API sin simular una respuesta vacía', async () => {
  const api = load('src/api/usersSupport.ts', { './client': { apiFetch: async () => new Response(
    JSON.stringify({ error: { message: 'El número de semanas debe estar entre 2 y 26.' } }), { status: 422 }) } });
  await assert.rejects(api.fetchRolesWeekly(27), /entre 2 y 26/);
});

test('gráfico conserva orden entre años y cero recibido; rechaza longitudes desalineadas', () => {
  const charts = new Proxy({}, { get: (_, name) => name });
  const { RoleWeeklyChart } = load('src/pages/usuarios/RoleWeeklyChart.tsx', { recharts: charts, '../../lib/roleMeta': roles, '../../lib/usersSupportMeta': dates });
  const weekly = { computed_at: at, weeks: ['S52', 'S1'], series: [{ role: 'family', values: [5, 0] }] };
  const tree = RoleWeeklyChart({ weekly });
  const data = tree.props.children.props.data;
  assert.equal(data[0].week, 'S52'); assert.equal(data[1].week, 'S1');
  assert.equal(data[1].Familiares, 0);
  const invalid = renderToStaticMarkup(React.createElement(RoleWeeklyChart, { weekly: { ...weekly, series: [{ role: 'family', values: [5] }] } }));
  assert.match(invalid, /Las series no coinciden/);
  const empty = renderToStaticMarkup(React.createElement(RoleWeeklyChart, { weekly: { weeks: [], series: [] } }));
  assert.match(empty, /Sin datos de actividad semanal/);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function section(tree, title) {
  return find(tree, node => node.type === 'section' && !!find(node.props.children,
    child => child.type === 'div' && child.props.className === 'card-title' && child.props.children === title));
}
function harness(overrides = {}) {
  const state = [], calls = { roles: [], weekly: [], categories: [], support: 0, recent: 0 };
  let cursor = 0, pending = [];
  const same = (a, b) => a && a.length === b.length && a.every((value, index) => value === b[index]);
  const hooks = {
    useState: initial => { const index = cursor++; if (!(index in state)) state[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [state[index].value, next => { state[index].value = typeof next === 'function' ? next(state[index].value) : next; }]; },
    useCallback: (callback, deps) => { const index = cursor++; if (!same(state[index]?.deps, deps)) state[index] = { deps, value: callback }; return state[index].value; },
    useEffect: (effect, deps) => { const index = cursor++; if (!same(state[index]?.deps, deps)) pending.push(() => {
      state[index]?.cleanup?.(); state[index] = { deps, cleanup: effect() };
    }); },
  };
  const api = {
    fetchRolesSummary: days => { calls.roles.push(days); return overrides.roles ? overrides.roles(days) : Promise.resolve({ days, computed_at: at, roles: [roleRow] }); },
    fetchRolesWeekly: weeks => { calls.weekly.push(weeks); return overrides.weekly ? overrides.weekly(weeks) : Promise.resolve({ computed_at: at, weeks: ['S43', 'S44'],
      week_details: [{ start_date: '2026-10-19', end_date: '2026-10-25', is_current_week: false },
        { start_date: '2026-10-26', end_date: '2026-11-01', is_current_week: true }],
      series: [{ role: 'family', values: [1, 0] }] }); },
    fetchSupportSummary: () => { calls.support++; return Promise.resolve(overrides.support ?? baseSupport); },
    fetchTicketsByCategory: days => { calls.categories.push(days); return Promise.resolve(overrides.categories ?? { ...baseCategories, days }); },
    fetchRecentTickets: () => { calls.recent++; return Promise.resolve({ items: [] }); },
  };
  const { UsuariosPage } = load('src/pages/usuarios/UsuariosPage.tsx', { react: hooks, '../../api/usersSupport': api,
    '../../lib/format': format, '../../lib/roleMeta': roles, '../../lib/usersSupportMeta': dates,
    '../../lib/ticketMeta': { TICKET_PRIORITY_META: {}, TICKET_STATUS_META: {} },
    '../../components/KpiCard': load('src/components/KpiCard.tsx'),
    './RoleWeeklyChart': { RoleWeeklyChart: () => null }, './TicketsCategoryChart': { TicketsCategoryChart: () => null },
  });
  return { calls, render() { cursor = 0; pending = []; return UsuariosPage(); },
    async flush() { pending.forEach(run => run()); await new Promise(resolve => setImmediate(resolve)); } };
}

test('pantalla distingue ventanas y contadores, CSAT sin encuestas y cero de respuesta ambiguo', async () => {
  const h = harness({ roles: () => Promise.resolve({ days: 90, computed_at: at, roles: [roleRow] }) });
  h.render(); await h.flush();
  const tree = h.render(), html = renderToStaticMarkup(tree);
  assert.match(html, /Período aplicado: 90 días/);
  assert.match(html, /en 8 semanas/); assert.match(html, /Retención · 30 días/);
  assert.match(html, /Una cuenta puede tener varios perfiles/);
  assert.match(html, /Estado actual de la cola/); assert.match(html, /Resultados de los últimos 30 días/);
  assert.match(html, /Sin encuestas disponibles/); assert.match(html, /Sin datos/);
  assert.match(html, /ausencia de respuestas y un promedio de cero horas/);
  assert.doesNotMatch(html, /999999|999\.999|Objetivo:|vs semana anterior/);
  const categoriesHtml = renderToStaticMarkup(section(tree, 'Tickets por categoría'));
  assert.doesNotMatch(categoriesHtml, /Calculado|2026|27-10/);
  assert.ok(categoriesHtml.indexOf('Primera categoría') < categoriesHtml.indexOf('Segunda categoría'));
  assert.match(categoriesHtml, /66,7%/);
});

test('controles consultan secciones independientes e ignoran respuestas anteriores', async () => {
  let resolveOld;
  const h = harness({ roles: days => days === 30 ? new Promise(resolve => { resolveOld = resolve; })
    : Promise.resolve({ days, computed_at: at, roles: [roleRow] }) });
  h.render(); await h.flush();
  let tree = h.render();
  find(section(tree, 'Actividad por perfil'), node => node.type === 'select').props.onChange({ target: { value: '90' } });
  h.render(); await h.flush();
  resolveOld({ days: 30, computed_at: at, roles: [roleRow] });
  await new Promise(resolve => setImmediate(resolve));
  tree = h.render();
  assert.match(renderToStaticMarkup(tree), /Período aplicado: 90 días/);
  find(section(tree, 'Usuarios activos semanales por perfil'), node => node.type === 'form').props.onSubmit({
    preventDefault() {}, currentTarget: { weeks: '26' },
  });
  h.render(); await h.flush(); tree = h.render();
  find(section(tree, 'Tickets por categoría'), node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { days: '365' } });
  h.render(); await h.flush();
  assert.deepEqual(h.calls.roles, [30, 90]); assert.deepEqual(h.calls.weekly, [8, 26]);
  assert.deepEqual(h.calls.categories, [30, 365]); assert.equal(h.calls.support, 1); assert.equal(h.calls.recent, 1);
  assert.match(renderToStaticMarkup(h.render()), /Últimos 365 días/);
});

test('un fallo semanal no oculta otras secciones y categorías vacías no generan gráfico ni fecha', async () => {
  const h = harness({ weekly: () => Promise.reject(new Error('Actividad semanal no disponible')), categories: { days: 30, total: 0, categories: [] } });
  h.render(); await h.flush();
  const tree = h.render(), html = renderToStaticMarkup(tree);
  assert.match(html, /Actividad semanal no disponible/);
  assert.match(html, /Período aplicado: 30 días/); assert.match(html, /Estado actual de la cola/);
  assert.match(html, /No hay tickets por categoría/);
  assert.doesNotMatch(renderToStaticMarkup(section(tree, 'Tickets por categoría')), /Calculado/);
});

test('CSAT válido y delta de respuesta cero se conservan', async () => {
  const h = harness({ support: { ...baseSupport, csat_avg: 4.5, csat_count: 10, first_response_hours_avg: 2,
    deltas: { ...baseSupport.deltas, first_response_mom_hours: 0 } } });
  h.render(); await h.flush();
  const html = renderToStaticMarkup(section(h.render(), 'Resumen de soporte'));
  assert.match(html, /4,5 \/ 5/); assert.match(html, /10 encuestas/);
  assert.match(html, /0 h frente a los 30 días anteriores/);
  assert.doesNotMatch(html, /ausencia de respuestas/);
});

test('rangos semanales muestran mes/año sin desplazar fechas y cubren cruces', () => {
  const period = { start_date: '2026-10-12', end_date: '2026-10-18', is_current_week: false };
  assert.equal(dates.weeklyRangeLabel(period), '12–18 de octubre de 2026');
  assert.equal(dates.weeklyRangeLabel({ start_date: '2026-10-26', end_date: '2026-11-01' }), '26 de octubre – 1 de noviembre de 2026');
  assert.equal(dates.weeklyRangeLabel({ start_date: '2026-12-28', end_date: '2027-01-03' }), '28 de diciembre de 2026 – 3 de enero de 2027');
  assert.match(dates.weeklyShortLabel(period), /^12/);
});

test('gráfico usa fechas reales y explica la semana en curso en el detalle', () => {
  const charts = new Proxy({}, { get: (_, name) => name });
  const { RoleWeeklyChart } = load('src/pages/usuarios/RoleWeeklyChart.tsx', {
    recharts: charts, '../../lib/roleMeta': roles, '../../lib/usersSupportMeta': dates,
  });
  const period = { start_date: '2026-10-12', end_date: '2026-10-18', is_current_week: true };
  const weekly = { weeks: ['S42'], week_details: [period], series: [{ role: 'family', values: [7] }] };
  const tree = RoleWeeklyChart({ weekly });
  const data = tree.props.children.props.data;
  assert.match(data[0].week, /2026/);
  assert.equal(data[0].range, '12–18 de octubre de 2026 · En curso · datos parciales');
  assert.equal(data[0].Familiares, 7);
  const invalid = renderToStaticMarkup(React.createElement(RoleWeeklyChart, { weekly: { ...weekly, week_details: [] } }));
  assert.match(invalid, /Las series no coinciden/);
});

test('pantalla presenta período y rangos, marca parcialidad y renombra el selector', async () => {
  const h = harness(); h.render(); await h.flush();
  const html = renderToStaticMarkup(section(h.render(), 'Usuarios activos semanales por perfil'));
  assert.match(html, /Cantidad de semanas a mostrar/);
  assert.match(html, /Período mostrado: 19 de octubre de 2026 al 1 de noviembre de 2026/);
  assert.match(html, /26 de octubre – 1 de noviembre de 2026 · En curso · datos parciales/);
  assert.doesNotMatch(html, /Semanas a consultar|no permiten identificar/);
});

test('API anterior sin rangos conserva consulta y avisa de fechas ausentes', async () => {
  const h = harness({ weekly: () => Promise.resolve({ weeks: ['S42'], series: [{ role: 'family', values: [1] }], computed_at: at }) });
  h.render(); await h.flush();
  const html = renderToStaticMarkup(section(h.render(), 'Usuarios activos semanales por perfil'));
  assert.match(html, /Fechas de las semanas no disponibles/);
  assert.doesNotMatch(html, /Período mostrado:|Semana en curso · datos parciales/);
});
