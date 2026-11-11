const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, Date, AbortController, URLSearchParams, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(path, name, dependencies = {}, props = {}) {
  const states = [], previous = [], cleanup = [], effects = [];
  let si = 0, ei = 0;
  const hooks = { ...React, useRef: value => ({ current: value }),
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, values) { const i = ei++; if (!previous[i] || values.some((v, j) => v !== previous[i][j])) {
      previous[i] = values; effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); });
    } },
  };
  const component = load(path, { ...dependencies, react: hooks })[name];
  const tree = () => { si = 0; ei = 0; return component(props); };
  return { tree, html: () => renderToStaticMarkup(tree()), find: predicate => find(tree(), predicate),
    async settle() { tree(); effects.splice(0).forEach(fn => fn()); await new Promise(setImmediate); } };
}
const source = { data_origin: 'demo', deactivation_effect: 'demo_only' };
const account = { ...source, user_id: 'account-1', full_name: 'Cuenta de prueba', email: 'prueba@example.test', is_active: true, memberships_count: 2,
  memberships: [{ patient_id: 'p1', patient_name: 'Paciente uno', role: 'family', is_owner: true }, { patient_id: 'p2', patient_name: 'Paciente dos', role: 'caregiver', is_owner: false }],
  deactivated_at: null, deactivation_reason: null };
const patient = { ...source, patient_id: 'p1', full_name: 'Paciente uno', members_count: 0, members: [] };
function page(items = [account], total = items.length) { return { ...source, items, total, page: 1, page_size: 25 }; }
const meta = load('src/lib/endUsersMeta.ts');
const Detail = load('src/pages/usuarios-app/DirectoryDetail.tsx', { '../../lib/endUsersMeta': meta }).DirectoryDetail;
const Dialog = load('src/pages/usuarios-app/DeactivateDialog.tsx').DeactivateDialog;

test('servicios separan usuarios finales del personal y envían confirmación/motivo sin secretos en URL', async () => {
  const calls = [];
  const api = load('src/api/endUsers.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, method: options?.method, body: options?.body && JSON.parse(options.body) });
    return new Response(JSON.stringify({ ...page(), user: account, mobile_sessions_revoked: false }));
  } } });
  await api.fetchEndUsers(' prueba@example.test ', 'false', 2);
  await api.fetchPatients(' persona01@example.test ', 1);
  await api.fetchEndUser('account-1'); await api.fetchPatient('p1');
  await api.deactivateEndUser('account-1', '  Solicitud de prueba  ');
  assert.ok(calls[0].path.startsWith('/end-users?') && calls[0].path.includes('is_active=false') && calls[0].path.includes('page=2'));
  assert.ok(calls[1].path.startsWith('/patients?'));
  assert.deepEqual(calls[4].body, { confirmation_user_id: 'account-1', reason: 'Solicitud de prueba' });
  assert.equal(calls[4].method, 'POST'); assert.ok(!calls[4].path.includes('Solicitud'));
  assert.ok(calls.every(c => !c.path.startsWith('/users')));
});

test('servicios rechazan procedencia ambigua y propagan indisponibilidad sin presentarla como vacío', async () => {
  let response = new Response(JSON.stringify({ ...page(), data_origin: 'live' }));
  const api = load('src/api/endUsers.ts', { './client': { apiFetch: async () => response } });
  await assert.rejects(api.fetchEndUsers('', '', 1), /procedencia/);
  response = new Response(JSON.stringify({ error: { message: 'Servicio móvil no conectado' } }), { status: 503 });
  await assert.rejects(api.fetchPatients('', 1), /no conectado/);
  response = new Response(JSON.stringify({ ...source, user: account, mobile_sessions_revoked: true }));
  await assert.rejects(api.deactivateEndUser('account-1', 'Prueba'), /validar la respuesta/);
});

test('detalle explica perfil por paciente, no ofrece edición clínica ni desactivación de ficha paciente', () => {
  const html = renderToStaticMarkup(React.createElement(Detail, { record: account, onSelect() {}, onDeactivate() {}, onClose() {} }));
  assert.ok(html.includes('Familiar') && html.includes('Cuidador/a') && html.includes('Paciente uno') && html.includes('Paciente dos'));
  assert.ok(html.includes('Desactivar cuenta'));
  const other = renderToStaticMarkup(React.createElement(Detail, { record: patient, onSelect() {}, onDeactivate() {}, onClose() {} }));
  assert.ok(other.includes('no tiene miembros vinculados') && other.includes('no implica que exista una cuenta'));
  assert.ok(!other.includes('Desactivar cuenta') && !other.includes('Editar') && !other.includes('Eliminar'));
});

test('desactivación requiere motivo y casilla, conserva error y no cierra por clic exterior', async () => {
  const calls = [];
  const form = mount('src/pages/usuarios-app/DeactivateDialog.tsx', 'DeactivateDialog', {}, {
    user: account, onConfirm: async reason => { calls.push(reason); throw new Error('Conflicto de prueba'); }, onClose() {},
  });
  assert.ok(form.html().includes('La cuenta quedará inactiva'));
  assert.ok(form.html().includes('Se conservarán sus datos y vínculos de cuidado'));
  assert.equal(form.find(n => n.type === 'button' && n.props.type === 'submit').props.disabled, true);
  assert.equal(form.tree().props.onClick, undefined);
  form.find(n => n.type === 'textarea').props.onChange({ target: { value: '  Solicitud válida  ' } });
  await form.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 0);
  form.find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  await form.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, ['Solicitud válida']);
  await new Promise(setImmediate);
  assert.ok(form.html().includes('Conflicto de prueba'));
  assert.equal(form.find(n => n.type === 'textarea').props.value, '  Solicitud válida  ');
  assert.equal(form.find(n => n.type === 'input' && n.props.type === 'checkbox').props.checked, true);
});

function screen(api, role = 'admin') {
  return mount('src/pages/usuarios-app/EndUsersPage.tsx', 'EndUsersPage', {
    '../../auth/AuthContext': { useAuth: () => ({ user: { role } }) }, '../../api/endUsers': api,
    './DirectoryDetail': { DirectoryDetail: Detail }, './DeactivateDialog': { DeactivateDialog: Dialog },
  });
}
test('pantalla sin aviso superior consulta filtros/páginas y descarta respuestas tardías de otro directorio', async () => {
  const pending = [], calls = [];
  const h = screen({ fetchEndUsers: (...args) => { calls.push(args.slice(0, 3)); return new Promise(resolve => pending.push(resolve)); },
    fetchPatients: async () => page([patient]), fetchEndUser: async () => account, fetchPatient: async () => patient });
  await h.settle(); assert.ok(!h.html().includes('Datos de demostración'));
  h.find(n => n.type === 'button' && n.props.children === 'Pacientes').props.onClick(); await h.settle();
  pending[0](page([{ ...account, full_name: 'Respuesta antigua' }])); await h.settle();
  assert.ok(h.html().includes('Paciente uno') && !h.html().includes('Respuesta antigua'));
  h.find(n => n.type === 'button' && n.props.children === 'Usuarios de la app').props.onClick(); await h.settle();
  pending[1](page([account], 32)); await h.settle();
  h.find(n => n.type === 'button' && n.props.children === 'Siguiente').props.onClick(); await h.settle();
  assert.equal(calls.at(-1)[2], 2);
  pending.at(-1)(page([account], 32)); await h.settle();
  h.find(n => n.type === 'input').props.onChange({ target: { value: 'prueba@example.test' } });
  h.find(n => n.type === 'select').props.onChange({ target: { value: 'false' } });
  h.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await h.settle();
  assert.deepEqual(calls.at(-1), ['prueba@example.test', 'false', 1]);
});

test('pantalla distingue fallo de listado vacío y los otros cuatro roles no consultan el servicio', async () => {
  let calls = 0;
  const h = screen({ fetchEndUsers: async () => { throw new Error('Origen no conectado'); } });
  await h.settle(); assert.ok(h.html().includes('Origen no conectado'));
  assert.ok(!h.html().includes('No hay coincidencias'));
  for (const role of ['support', 'analyst', 'editor', 'moderator']) {
    const restricted = screen({ fetchEndUsers: async () => { calls++; return page(); } }, role);
    await restricted.settle(); assert.ok(restricted.html().includes('No tienes permiso'));
  }
  assert.equal(calls, 0);
  const empty = screen({ fetchEndUsers: async () => page([]) });
  await empty.settle(); assert.ok(empty.html().includes('No hay coincidencias'));
});

test('confirmar desactivación actualiza estado y confirma conservación de vínculos', async () => {
  let active = true;
  const h = screen({ fetchEndUsers: async () => page([{ ...account, is_active: active }]),
    fetchEndUser: async () => ({ ...account, is_active: active }),
    deactivateEndUser: async (id, reason) => { assert.equal(id, 'account-1'); assert.equal(reason, 'Solicitud de prueba'); active = false;
      return { ...source, user: { ...account, is_active: false }, mobile_sessions_revoked: false }; } });
  await h.settle();
  h.find(n => n.type === 'button' && n.props.children === 'Ver detalle').props.onClick(); await h.settle();
  h.find(n => n.type === Detail).props.onDeactivate(account);
  await h.find(n => n.type === Dialog).props.onConfirm('Solicitud de prueba'); await h.settle();
  assert.ok(h.html().includes('Inactiva') && h.html().includes('Cuenta desactivada. Se conservan sus datos y vínculos de cuidado'));
  assert.equal(h.find(n => n.type === Dialog), undefined);
});
