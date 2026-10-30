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
const meta = load('src/lib/moderationMeta.ts');
const common = { '../../lib/moderationMeta': meta, '../../lib/format': { fmt: String, ticketDate: String },
  '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'moderator' } }) } };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(path, name, dependencies, props = {}) {
  const states = [], effects = [], previous = [], cleanup = [];
  let si = 0, ei = 0;
  const hooks = { ...React, useState(initial) { const i = si++; if (!(i in states)) states[i] = initial;
    return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, values) { const i = ei++; if (!previous[i] || values.some((value, j) => value !== previous[i][j])) {
      previous[i] = values; effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); });
    } },
  };
  const component = load(path, { ...common, ...dependencies, react: hooks })[name];
  const tree = () => { si = 0; ei = 0; return component(props); };
  return { tree, html: () => renderToStaticMarkup(tree()), find: predicate => find(tree(), predicate),
    async settle() { tree(); effects.splice(0).forEach(fn => fn()); await new Promise(setImmediate); } };
}
const item = { id: 'review', type: 'review', status: 'pending', content: { text: '<script>Texto</script>', rating: 0 },
  is_safety: true, author: { name: 'Autora' }, created_at: '2026-10-27' };

test('moderación usa página y motivos/notas reales sin textos automáticos', async () => {
  const calls = [];
  const api = load('src/api/moderation.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, body: options?.body && JSON.parse(options.body) }); return new Response('{}');
  } } });
  await api.fetchModerationQueue({ status: 'rejected', type: 'review', page: 2 });
  assert.match(calls[0].path, /page=2&page_size=25&status=rejected&type=review/);
  await api.decideModeration('id', { decision: 'reject', reason_code: 'privacy', note: 'Explicación real' });
  assert.deepEqual(calls[1].body, { reason_code: 'privacy', note: 'Explicación real' });
  await api.decideModeration('id', { decision: 'approve' }); assert.deepEqual(calls[2].body, {});
});

test('other exige explicación y error conserva nota/motivo para corregir', async () => {
  const calls = [];
  const detail = mount('src/pages/moderacion/ModerationDetail.tsx', 'ModerationDetail', { '../../api/moderation': {
    decideModeration: async (_id, body) => { calls.push(body); throw new Error('ALREADY_MODERATED: recarga'); },
  } }, { item, onResolved() {} });
  const reject = () => detail.find(node => node.type === 'button' && node.props.children === 'Rechazar');
  reject().props.onClick(); await new Promise(setImmediate); assert.equal(calls.length, 0);
  assert.match(detail.html(), /debes escribir una explicación/);
  detail.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Revisión del contenido' } });
  detail.find(node => node.type === 'select').props.onChange({ target: { value: 'privacy' } });
  reject().props.onClick(); await new Promise(setImmediate);
  assert.equal(calls[0].reason_code, 'privacy'); assert.equal(calls[0].note, 'Revisión del contenido');
  assert.match(detail.html(), /ALREADY_MODERATED/); assert.equal(detail.find(node => node.type === 'textarea').props.value, 'Revisión del contenido');
});

test('histórico legible, texto escapado y contenido privado sin acceso ni decisiones ciegas', () => {
  const { ModerationDetail } = load('src/pages/moderacion/ModerationDetail.tsx', { ...common, '../../api/moderation': {} });
  const html = renderToStaticMarkup(React.createElement(ModerationDetail, { item: { ...item, status: 'rejected',
    decided_by_name: 'Revisora', decided_at: '2026-10-27', decision_note: 'Nota histórica', reject_reason_code: 'privacy' }, onResolved() {} }));
  assert.match(html, /Nota histórica/); assert.match(html, /Revisora/); assert.match(html, /Prioridad de seguridad/);
  assert.match(html, /Calificación/); assert.doesNotMatch(html, /<script>/); assert.doesNotMatch(html, />Aprobar</);
  const privateHtml = renderToStaticMarkup(React.createElement(ModerationDetail, { item: { ...item, type: 'photo', content: { url: 'secreto-no-mostrar' } }, onResolved() {} }));
  assert.match(privateHtml, /acceso temporal/); assert.doesNotMatch(privateHtml, /secreto-no-mostrar/); assert.doesNotMatch(privateHtml, />Rechazar</);
  const reader = load('src/pages/moderacion/ModerationDetail.tsx', { ...common, '../../api/moderation': {},
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) } });
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(reader.ModerationDetail, { item, onResolved() {} })), />Aprobar</);
});

test('cola filtra, pagina y descarta respuestas anteriores', async () => {
  const calls = [];
  const page = mount('src/pages/moderacion/ModerationPage.tsx', 'ModerationPage', {
    '../../api/moderation': { fetchModerationQueue: params => new Promise(resolve => calls.push({ params, resolve })) },
    './ModerationDetail': { ModerationDetail: () => null }, './ModerationTable': { ModerationTable: () => null },
  });
  await page.settle(); assert.equal(calls[0].params.status, 'pending');
  page.find(node => node.props?.['aria-label'] === 'Filtrar moderación').props.onChange({ target: { value: 'review' } });
  await page.settle();
  calls[1].resolve({ items: [], total: 30, page: 1, page_size: 25 }); await new Promise(setImmediate);
  calls[0].resolve({ items: [], total: 999, page: 1, page_size: 25 }); await new Promise(setImmediate);
  assert.doesNotMatch(page.html(), /999 elementos/);
  page.find(node => node.type === 'button' && node.props.children === 'Siguiente').props.onClick(); await page.settle();
  assert.equal(calls.at(-1).params.page, 2);
  page.find(node => node.props?.['aria-label'] === 'Estado de moderación').props.onChange({ target: { value: 'approved' } }); await page.settle();
  assert.equal(calls.at(-1).params.page, 1); assert.equal(calls.at(-1).params.type, 'review');
});
