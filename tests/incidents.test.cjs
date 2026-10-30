const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
class FormValues { constructor(values) { this.values = values; } get(name) { return this.values[name] ?? null; } }
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, URLSearchParams, FormData: FormValues, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const permissions = load('src/routes/permissions.ts');
const meta = load('src/lib/incidentsMeta.ts');
const ops = load('src/lib/operationalMeta.ts');
const sample = { id: 'incident-1', title: 'Incidente original', description: 'Descripción original',
  status: 'observing', is_maintenance: false, component_key: null, severity: 'degraded',
  started_at: '2026-10-26T12:00:00Z', resolved_at: null, resolution: null, created_by: 'actor-1',
  updated_at: '2026-10-26T12:00:00Z', notification_status: 'not_configured' };
function hooks() {
  const states = []; let cursor = 0, effects = [];
  return { reset() { cursor = 0; effects = []; }, run() { effects.forEach(effect => effect()); }, react: {
    useState: initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useEffect: effect => effects.push(effect),
  } };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function formHarness(role, api = {}) {
  const h = hooks();
  const { IncidentForm } = load('src/pages/operativo/IncidentForm.tsx', {
    react: h.react, '../../auth/AuthContext': { useAuth: () => ({ user: { role } }) },
    '../../routes/permissions': permissions, '../../lib/operationalMeta': ops, '../../lib/incidentsMeta': meta,
    '../../api/incidents': api,
  });
  return { render(props = {}) { h.reset(); return IncidentForm({ onSaved() {}, onCancel() {}, ...props }); } };
}

test('servicio transmite filtros, paginación y PATCH parcial con cliente protegido', async () => {
  const calls = [];
  const api = load('src/api/incidents.ts', { './client': { apiFetch: async (...args) => {
    calls.push(args); return new Response('{}');
  } } });
  await api.fetchIncidents({ days: 365, status: 'observing', component: 'auth', page: 2, page_size: 10 });
  const url = new URL(calls[0][0], 'http://local');
  assert.equal(url.searchParams.get('days'), '365');
  assert.equal(url.searchParams.get('status'), 'observing');
  assert.equal(url.searchParams.get('component'), 'auth');
  assert.equal(url.searchParams.get('page'), '2');
  await api.updateIncident('id/seguro', { resolution: 'Resuelto' });
  assert.equal(calls[1][0], '/ops/incidents/id%2Fseguro');
  assert.equal(calls[1][1].method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1][1].body), { resolution: 'Resuelto' });
});

test('solo admin/support reciben formulario de gestión; analyst conserva consulta', () => {
  for (const role of ['admin', 'support', 'analyst', 'editor', 'moderator', undefined]) {
    const tree = formHarness(role).render();
    assert.equal(tree !== null, role === 'admin' || role === 'support');
  }
});

test('editor de cierre exige nota y envía solo estado/resolución, conservando descripción', async () => {
  const calls = []; let saved = false;
  const h = formHarness('support', { updateIncident: async (id, body) => { calls.push({ id, body }); return { ...sample, ...body }; } });
  const props = { incident: sample, onSaved() { saved = true; } };
  let tree = h.render(props);
  find(tree, node => node.type === 'select').props.onChange({ target: { value: 'resolved' } });
  tree = h.render(props);
  assert.equal(find(tree, node => node.props?.name === 'resolution').props.required, true);
  await tree.props.onSubmit({ preventDefault() {}, currentTarget: { description: sample.description, resolution: 'Servicio restablecido' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(saved, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), { status: 'resolved', resolution: 'Servicio restablecido' });
});

test('formulario admite mantenimiento futuro y conserva errores de rechazo del backend', async () => {
  let created;
  const h = formHarness('admin', { createIncident: async body => { created = body; throw new Error('No fue posible registrar'); } });
  let tree = h.render();
  find(tree, node => node.props?.type === 'checkbox').props.onChange({ target: { checked: true } });
  tree = h.render();
  await tree.props.onSubmit({ preventDefault() {}, currentTarget: { title: 'Mantenimiento programado', description: 'Actualizar servicio',
    severity: 'degraded', started_at: new Date(Date.now()+86400000).toISOString(), component_key: '' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(created.is_maintenance, true);
  assert.equal(created.component_key, null);
  assert.match(renderToStaticMarkup(h.render()), /No fue posible registrar/);
});

test('transiciones visibles diferencian incidentes y mantenimientos', () => {
  assert.deepEqual(Array.from(meta.incidentNext({ ...sample, status: 'investigating' })), ['observing']);
  assert.deepEqual(Array.from(meta.incidentNext(sample)), ['resolved']);
  assert.deepEqual(Array.from(meta.incidentNext({ ...sample, is_maintenance: true })), ['completed']);
  assert.deepEqual(Array.from(meta.incidentNext({ ...sample, status: 'resolved' })), []);
  assert.match(meta.incidentMailLabel('not_configured'), /no enviado/);
  assert.match(meta.incidentMailLabel('queued'), /pendiente/);
});

test('panel consulta, pagina, filtra y muestra detalle sin edición para analyst', async () => {
  const calls = [], h = hooks();
  const { IncidentsPanel } = load('src/pages/operativo/IncidentsPanel.tsx', {
    react: h.react, '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'analyst' } }) },
    '../../routes/permissions': permissions, '../../lib/operationalMeta': ops, '../../lib/incidentsMeta': meta,
    './IncidentForm': { IncidentForm: () => assert.fail('Analyst no debe montar editor') },
    '../../api/incidents': { fetchIncidents: async filters => { calls.push(filters);
      return { items: [sample], page: filters.page, page_size: 10, total: 11 }; } },
  });
  const render = () => { h.reset(); return IncidentsPanel({ refreshKey: 0 }); };
  render(); h.run(); await new Promise(resolve => setImmediate(resolve));
  let tree = render();
  const html = renderToStaticMarkup(tree);
  assert.doesNotMatch(html, /Registrar incidente/);
  find(tree, node => node.type === 'button' && node.props.children === 'Ver detalle').props.onClick();
  assert.doesNotMatch(renderToStaticMarkup(render()), /Actualizar registro/);
  tree = render();
  find(tree, node => node.type === 'button' && node.props.children === 'Siguiente').props.onClick();
  render(); h.run(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[1].page, 2);
  tree = render();
  find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { days: '7', status: 'resolved', component: 'auth' } });
  render(); h.run(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[2].page, 1);
  assert.equal(calls[2].days, 7);
  assert.equal(calls[2].status, 'resolved');
});
