const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, URLSearchParams, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const meta = load('src/lib/gamesMeta.ts');
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function form(editingItem, role = 'editor') {
  const states = [], calls = [];
  let index = 0;
  const hooks = { ...React, useState(initial) {
    const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
    return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
  } };
  const { GameFormModal } = load('src/pages/juegos/GameFormModal.tsx', {
    react: hooks, '../../lib/gamesMeta': meta, '../../auth/AuthContext': { useAuth: () => ({ user: { role } }) },
    '../../api/gamesApps': { createGameApp: async payload => calls.push(payload), updateGameApp: async (_id, payload) => calls.push(payload) },
  });
  const tree = () => { index = 0; return GameFormModal({ editingItem, onClose() {}, onSaved() {} }); };
  return { tree, calls, html: () => renderToStaticMarkup(tree()), find: predicate => find(tree(), predicate) };
}

test('juegos: creación inactiva y recurso local; edición solo manda campos cambiados y conserva estado', async () => {
  const fresh = form(null);
  assert.match(fresh.html(), /creará inactivo/); assert.doesNotMatch(fresh.html(), />\s*Activo\s*</);
  const slugInput = fresh.find(node => node.type === 'input' && node.props.pattern);
  slugInput.props.onChange({ target: { value: 'mi-juego' } });
  const url = fresh.find(node => node.type === 'input' && node.props.placeholder === '/static/juegos/identificador/index.html');
  assert.equal(url.props.value, '/static/juegos/mi-juego/index.html');
  await fresh.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(fresh.calls[0].is_active, false);
  const old = { id: 'id', title: 'Juego', slug: 'mi-juego', description: '', item_type: 'game', category: 'Memoria',
    min_tier: 'gratuito', is_active: true, featured: false, target_url: 'http://localhost:8000/static/juegos/mi-juego/index.html' };
  const edit = form(old);
  edit.find(node => node.type === 'input' && node.props.value === 'Juego').props.onChange({ target: { value: 'Nuevo título' } });
  await edit.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(JSON.stringify(edit.calls[0]), JSON.stringify({ title: 'Nuevo título' }));
  assert.equal(form(old, 'analyst').tree(), null);
});

test('servicio de juegos transmite filtro de estado y conserva array de activos de la API', async () => {
  const paths = [];
  const api = load('src/api/gamesApps.ts', { './client': { apiFetch: async path => {
    paths.push(path); return new Response(JSON.stringify([{ id: 'game' }]));
  } } });
  await api.fetchGamesApps('game', 'false');
  assert.equal(paths[0], '/games-apps/?item_type=game&is_active=false');
  assert.equal((await api.fetchActiveGamesApps())[0].id, 'game');
});

test('dirección bloqueada inicialmente; habilitar permite externa y desmarcar restaura dirección', async () => {
  const fresh = form(null);
  const address = () => fresh.find(node => node.type === 'input' && node.props.placeholder === '/static/juegos/identificador/index.html');
  const checkbox = () => fresh.find(node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked === false);
  assert.equal(address().props.disabled, true);
  checkbox().props.onChange({ target: { checked: true } });
  assert.equal(address().props.disabled, false);
  address().props.onChange({ target: { value: 'https://juegos.example.cl/jugar' } });
  assert.match(fresh.html(), /no puede bloquear su enlace externo/);
  fresh.find(node => node.type === 'input' && node.props.pattern).props.onChange({ target: { value: 'externo' } });
  assert.equal(address().props.value, 'https://juegos.example.cl/jugar');
  await fresh.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(fresh.calls[0].target_url, 'https://juegos.example.cl/jugar');
  fresh.find(node => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked === true).props.onChange({ target: { checked: false } });
  assert.equal(address().props.value, '/static/juegos/externo/index.html'); assert.equal(address().props.disabled, true);
});

test('partida abierta comprueba disponibilidad y abandona el documento al desactivar o perder conexión', async () => {
  const source = fs.readFileSync('../agecare back rolo/agecare_administracion/app/static/juegos/compartido/disponibilidad.js', 'utf8');
  for (const state of ['active', 'inactive', 'offline']) {
    let poll, destination, request;
    const listeners = {};
    vm.runInNewContext(source, {
      URL, document: { currentScript: { src: 'https://agecare.test/prefix/static/juegos/compartido/disponibilidad.js' },
        addEventListener: (name, callback) => { listeners[name] = callback; } },
      window: { addEventListener: (name, callback) => { listeners[name] = callback; } },
      location: { pathname: '/prefix/static/juegos/memorama/index.html', replace: path => { destination = path; } },
      setInterval: (callback, ms) => { poll = callback; assert.equal(ms, 5000); },
      fetch: async (path, options) => { request = { path, options }; if (state === 'offline') throw new Error('sin red'); return { ok: state === 'active' }; },
    });
    await poll();
    assert.equal(request.options.method, 'HEAD'); assert.equal(request.options.cache, 'no-store');
    assert.equal(request.options.credentials, 'omit');
    assert.notEqual(request.options.mode, 'no-cors'); // Debe poder distinguir 200 de 403.
    assert.equal(destination, state === 'active' ? undefined : 'https://agecare.test/prefix/static/juegos/compartido/no-disponible.html');
    assert.ok(listeners.focus && listeners.visibilitychange);
  }
});
