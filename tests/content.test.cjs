const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const context = { exports: {}, URLSearchParams, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
test('contenido consulta páginas reales y aprueba explícitamente la versión revisada', async () => {
  const calls = [];
  const api = load('src/api/content.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, options }); return new Response(JSON.stringify({ items: [] }));
  } } });
  await api.fetchContent({ page: 3, type: 'news', status: 'draft', search: 'Texto & contexto' });
  const url = new URL(calls[0].path, 'http://local');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.get('q'), 'Texto & contexto');
  await api.contentAction('id', 'approve', 4);
  assert.deepEqual(JSON.parse(calls[1].options.body), { version: 4 });
  await api.reviewCandidate('candidate', 'own', 'Origen revisado', 'source-hash');
  assert.equal(JSON.parse(calls[2].options.body).source_hash, 'source-hash');
});
test('editor no recibe botón eliminar y no puede publicar audio pendiente', () => {
  const meta = load('src/lib/contentMeta.ts');
  const item = { id: 'id', title: 'Noticia revisada', body: 'Texto para revisión editorial', tags: [],
    type: 'news', status: 'draft', text_version: 2, approved_version: null,
    publish_at: null, updated_at: '2026-10-14T12:00:00Z', audio_available: false, audio_status: 'pending', provenance: null };
  function render(role) {
    const { ContentDetail } = load('src/pages/contenido/ContentDetail.tsx', {
      '../../api/content': {}, '../../auth/AuthContext': { useAuth: () => ({ user: { role } }) },
      '../../lib/contentMeta': meta, '../../lib/format': { ticketDate: value => value },
    });
    return renderToStaticMarkup(React.createElement(ContentDetail, { item, onChanged() {}, onDeleted() {} }));
  }
  const editor = render('editor');
  assert.ok(!editor.includes('Eliminar'));
  assert.match(editor, /disabled="">Publicar/);
  assert.ok(editor.includes('Aprobar texto y generar audio'));
  assert.ok(render('admin').includes('Eliminar'));
});
