const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(path, dependencies = {}, globals = {}) {
  const scope = { exports: {}, URLSearchParams, Error, require: name => dependencies[name] ?? require(name), ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
function hooks() {
  const states = [], effects = [];
  let cursor = 0;
  return { reset: () => { cursor = 0; }, effects, react: {
    useState: initial => { const id = cursor++; if (!(id in states)) states[id] = typeof initial === 'function' ? initial() : initial;
      return [states[id], value => { states[id] = typeof value === 'function' ? value(states[id]) : value; }]; },
    useRef: value => ({ current: value }),
    useEffect: effect => effects.push(effect),
  } };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}

test('MFA recovery separa solicitud pública de decisiones protegidas y no pone secretos en URLs', async () => {
  const calls = [];
  const { accessRequest } = load('src/api/accountAccess.ts', { './client': {
    API_BASE_URL: 'https://api', apiFetch: async (...args) => { calls.push(['private', ...args]); return new Response('{}'); },
    publicFetch: async (...args) => { calls.push(['public', ...args]); return new Response('{}'); },
  } });
  const api = load('src/api/mfaRecovery.ts', { './accountAccess': { accessRequest } });
  await api.requestMfaRecovery('test@example.org', 'PrivatePassword', 'Perdí el teléfono');
  await api.confirmMfaRecovery('PrivateToken');
  await api.fetchMfaRecoveries(2);
  await api.decideMfaRecovery('request-id', { decision: 'approve', identity_verified: true,
    note: 'Identidad verificada', password: 'PrivateAdminPassword', otp_code: '654321' });
  assert.deepEqual(calls.map(call => call[0]), ['public', 'public', 'private', 'private']);
  assert.equal(calls[2][1], '/mfa-recovery/requests?page=2');
  assert.equal(calls[3][1], '/mfa-recovery/requests/request-id/decision');
  for (const [, url, options] of calls) {
    assert.doesNotMatch(url, /Private|654321|test@example/);
    assert.equal(options.cache, 'no-store');
  }
  assert.equal(JSON.parse(calls[3][2].body).identity_verified, true);
});

test('confirmación MFA retira el fragmento y exige una acción explícita, sin abrir sesión', async () => {
  const state = hooks();
  const calls = [], history = [];
  const { MfaRecoveryPage } = load('src/pages/acceso/MfaRecoveryPage.tsx', {
    react: state.react,
    'react-router-dom': { Link: ({ children }) => React.createElement('a', null, children) },
    '../../components/ThemeToggle': { ThemeToggle: () => null },
    '../../api/mfaRecovery': { confirmMfaRecovery: async token => calls.push(token) },
  }, { window: { location: { hash: '#token=private-token', pathname: '/recuperar-mfa' },
    history: { replaceState: (...args) => history.push(args) } }, FormData: class { get() { return ''; } } });
  const render = () => { state.reset(); return MfaRecoveryPage(); };
  let tree = render();
  state.effects.splice(0).forEach(effect => effect());
  assert.equal(history[0][2], '/recuperar-mfa');
  assert.equal(calls.length, 0);
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { reset() {} } });
  tree = render();
  assert.deepEqual(calls, ['private-token']);
  assert.match(renderToStaticMarkup(tree), /Otro administrador debe verificar tu identidad/);
  assert.doesNotMatch(renderToStaticMarkup(tree), /private-token/);
});

test('el panel exige identidad al aprobar, conserva la decisión ante fallo y permite reintentar', async () => {
  const state = hooks();
  const calls = [];
  function Modal({ children }) { return React.createElement('div', null, children); }
  const item = { id: 'request-id', full_name: 'Cuenta solicitante', email: 'test@example.org', reason: 'Perdí los códigos',
    status: 'pending', confirmed_at: '2026-11-12T12:00:00Z', expires_at: '2026-11-13T12:00:00Z', can_decide: true };
  const { MfaRecoveryPanel } = load('src/pages/cuentas/MfaRecoveryPanel.tsx', {
    react: state.react, '../../components/Modal': { Modal },
    '../../api/mfaRecovery': {
      fetchMfaRecoveries: async () => ({ total: 1, items: [item] }),
      decideMfaRecovery: async (id, body) => { calls.push({ id, body }); if (calls.length === 1) throw new Error('No disponible'); },
    },
  }, { AbortController, FormData: class { get(key) { return key === 'password' ? 'PrivatePassword' : '123456'; } } });
  const render = () => { state.reset(); return nodes(MfaRecoveryPanel({ mfaEnabled: true })); };
  let tree = render();
  state.effects.splice(0).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  tree = render();
  tree.find(node => node.type === 'button' && node.props.children === 'Revisar solicitud').props.onClick();
  tree = render();
  tree.find(node => node.type === 'select').props.onChange({ target: { value: 'approve' } });
  tree = render();
  tree.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Verifiqué identidad por llamada' } });
  tree = render();
  assert.equal(tree.find(node => node.type === 'button' && node.props.children === 'Confirmar decisión').props.disabled, true);
  const event = { preventDefault() {}, currentTarget: { reset() {} } };
  await tree.find(node => node.type === 'form').props.onSubmit(event);
  assert.equal(calls.length, 0);
  tree.find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  tree = render();
  await tree.find(node => node.type === 'form').props.onSubmit(event);
  tree = render();
  assert.equal(tree.find(node => node.type === Modal).props.error, 'No disponible');
  assert.equal(tree.find(node => node.type === 'textarea').props.value, 'Verifiqué identidad por llamada');
  await tree.find(node => node.type === 'form').props.onSubmit(event);
  tree = render();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.identity_verified, true);
  assert.equal(calls[1].body.otp_code, '123456');
  assert.ok(!tree.some(node => node.type === Modal));
});
