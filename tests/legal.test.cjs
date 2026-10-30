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
const meta = load('src/lib/legalMeta.ts');
const common = { '../../lib/legalMeta': meta, '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'admin' } }) } };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(path, name, dependencies, props = {}) {
  const states = [], effects = [], previous = [], cleanup = [];
  let si = 0, ei = 0;
  const hooks = { ...React, useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
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
const at = '2026-10-27T15:00:00Z';
const old = { version_id: 'old', doc_type: 'terms', semver: '1.0', status: 'published', display_state: 'current',
  content_md: '# Texto conservado', changelog: 'Primera versión', effective_at: '2026-01-01T03:00:00Z', effective_date: '2026-01-01',
  published_at: '2025-12-10T15:00:00Z', requires_reacceptance: true, created_by_name: 'Administradora', created_at: at, updated_at: at };
const draft = { ...old, version_id: 'new', semver: '1.1', status: 'draft', display_state: 'draft', published_at: null,
  effective_at: '2026-10-29T03:00:00Z', effective_date: '2026-10-29', requires_reacceptance: false, content_md: '<script>texto</script>\nTexto revisable' };
function data(version = draft) {
  return { documents: [{ doc_type: 'terms', current: { version_id: 'old', semver: '1.0' }, versions: [version, old] }],
    computed_at: at, timezone: 'America/Santiago', earliest_major_effective_date: '2026-11-12' };
}

test('legales usa las tres rutas existentes y propaga errores de publicación', async () => {
  const calls = [];
  const api = load('src/api/legal.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, method: options?.method, body: options?.body && JSON.parse(options.body) });
    return path.includes('/publish') ? new Response(JSON.stringify({ error: { message: 'El aviso es insuficiente.' } }), { status: 422 }) : new Response('{}');
  } } });
  await api.fetchLegalDocuments(); await api.fetchLegalDocuments('privacy');
  const body = { semver: '1.1', content_md: 'Texto del documento', changelog: 'Cambios', effective_date: '2026-11-12' };
  await api.createLegalDraft('terms', body);
  await assert.rejects(api.publishLegalVersion('new'), /aviso es insuficiente/);
  assert.deepEqual(calls.map(row => row.path), ['/legal/documents', '/legal/documents?doc_type=privacy', '/legal/documents/terms/versions', '/legal/versions/new/publish']);
  assert.deepEqual(calls[2].body, body); assert.equal(calls[3].method, 'POST'); assert.equal(calls[3].body, undefined);
});

test('formulario conserva borrador ante error y muestra fecha recomendada del backend', async () => {
  let saved = 0, resets = 0;
  const calls = [];
  const form = mount('src/pages/legales/LegalDraftForm.tsx', 'LegalDraftForm', { '../../api/legal': {
    createLegalDraft: async (type, body) => { calls.push({ type, body }); throw new Error('NOTICE_PERIOD: fecha insuficiente'); },
  } }, { initialType: 'terms', earliestMajorDate: '2026-11-12', onSaved() { saved++; }, onCancel() {} });
  assert.match(form.html(), /12-11-2026/); assert.match(form.html(), /maxLength="10"/i);
  const values = { semver: '2.0', content_md: 'Texto revisado '.repeat(15), changelog: 'Resumen de cambios', effective_date: '2026-11-12', reset() { resets++; } };
  form.find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: values });
  await new Promise(setImmediate);
  assert.equal(calls[0].body.semver, '2.0'); assert.equal(calls[0].type, 'terms');
  assert.match(form.html(), /NOTICE_PERIOD/); assert.equal(saved, 0); assert.equal(resets, 0);
});

test('publicar muestra el resultado consultado sin convertir futura en vigente; texto escapado', async () => {
  let published = false;
  const calls = [];
  const page = mount('src/pages/legales/LegalPage.tsx', 'LegalPage', {
    '../../api/legal': { fetchLegalDocuments: async () => data(published ? { ...draft, status: 'published', display_state: 'scheduled', published_at: at } : draft),
      publishLegalVersion: async id => { calls.push(id); published = true; } },
    './LegalDraftForm': { LegalDraftForm: () => null },
  });
  await page.settle();
  page.find(node => node.type === 'button' && node.props.children === '1.1').props.onClick();
  assert.doesNotMatch(page.html(), /<script>/); assert.match(page.html(), /Texto revisable/);
  await page.find(node => node.type === 'button' && node.props.children === 'Publicar versión 1.1').props.onClick();
  await new Promise(setImmediate); await page.settle();
  assert.deepEqual(calls, ['new']); assert.match(page.html(), /Versión vigente: 1.0/);
  assert.match(page.html(), /Publicada · vigencia futura/); assert.doesNotMatch(page.html(), /Publicar versión 1.1/);
});

test('filtro descarta respuesta anterior y los roles no admin no consultan ni crean', async () => {
  const requests = [];
  const dependencies = { '../../api/legal': { fetchLegalDocuments: type => new Promise(resolve => requests.push({ type, resolve })) },
    './LegalDraftForm': { LegalDraftForm: () => null } };
  const page = mount('src/pages/legales/LegalPage.tsx', 'LegalPage', dependencies);
  await page.settle();
  page.find(node => node.props?.['aria-label'] === 'Filtrar documentos legales').props.onChange({ target: { value: 'privacy' } });
  await page.settle(); assert.equal(requests[1].type, 'privacy');
  requests[1].resolve({ ...data(), documents: [{ doc_type: 'privacy', current: null, versions: [] }] }); await new Promise(setImmediate);
  requests[0].resolve(data()); await new Promise(setImmediate);
  assert.match(page.html(), /Sin versión vigente/); assert.doesNotMatch(page.html(), /Versión vigente: 1.0/);
  for (const role of ['analyst', 'support', 'editor', 'moderator', undefined]) {
    const auth = { '../../auth/AuthContext': { useAuth: () => ({ user: role ? { role } : null }) } };
    const reader = mount('src/pages/legales/LegalPage.tsx', 'LegalPage', { ...dependencies, ...auth });
    const before = requests.length; await reader.settle(); assert.equal(requests.length, before);
    assert.doesNotMatch(reader.html(), /Nueva versión/);
    const { LegalDraftForm } = load('src/pages/legales/LegalDraftForm.tsx', { ...common, ...auth, '../../api/legal': {} });
    assert.equal(renderToStaticMarkup(React.createElement(LegalDraftForm, {})), '');
  }
});

test('fechas civiles conservan el día y el instante se presenta en Santiago', () => {
  assert.equal(meta.legalDay('2026-01-01'), '01-01-2026');
  assert.match(meta.legalDate('2026-10-29T03:00:00Z'), /00:00/);
  assert.equal(meta.legalDate(null), 'Sin fecha registrada');
});
