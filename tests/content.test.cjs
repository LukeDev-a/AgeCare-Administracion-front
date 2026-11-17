const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}, globals = {}) {
  const context = { exports: {}, Error, URLSearchParams, require: name => dependencies[name]
    ?? require('./helpers/filter-hooks.cjs').filterDependency(name, dependencies.react)
    ?? (name === './contentStyles' ? load('src/pages/contenido/contentStyles.ts')
      : name === '../../components/Modal' ? load('src/components/Modal.tsx') : require(name)), ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function mount(path, name, dependencies, props = {}, globals = {}) {
  const states = [], previous = [], effects = [], cleanups = [];
  let si = 0, ei = 0;
  const hooks = { ...React,
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, values) { const i = ei++; if (!previous[i] || values.some((value, j) => value !== previous[i][j])) {
      previous[i] = values; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
    } },
  };
  const component = load(path, { ...dependencies, react: hooks }, globals)[name];
  const tree = () => { si = 0; ei = 0; return component(props); };
  return { tree, find: predicate => find(tree(), predicate), html: () => renderToStaticMarkup(tree()),
    async settle() { tree(); effects.splice(0).forEach(fn => fn()); await new Promise(setImmediate); } };
}
test('adaptación confirma envío, bloquea duplicados y distingue cola, cuota y propuesta lista', async () => {
  const original = { id: 'candidate', title: 'Noticia de prueba', original_text: 'Contenido original por revisar', source_url: 'https://example.org',
    rights_status: 'own', source_hash: 'hash', status: 'pending', item_id: null, adaptation: null };
  const props = { candidate: original, onChanged() {}, onDraft() {}, onClose() {} };
  let finish, fail, calls = 0;
  const h = mount('src/pages/contenido/CandidateReview.tsx', 'CandidateReview', {
    '../../api/content': { requestAdaptation: () => { calls++; return new Promise((resolve, reject) => { finish = resolve; fail = reject; }); } },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'),
  }, props);
  const click = label => h.find(n => n.type === 'button' && n.props.children === label).props.onClick();
  click('Continuar a adaptación →'); click('Adaptar con Gemini');
  assert.equal(h.tree().props.busy, true);
  assert.match(h.html(), /Enviando solicitud/);
  finish(); await new Promise(setImmediate);
  assert.equal(original.status, 'pending', 'GET todavía no ha actualizado las props');
  assert.match(h.html(), /Adaptación solicitada · En cola/);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Solicitud pendiente').props.disabled, true);
  click('Solicitud pendiente'); assert.equal(calls, 1);
  props.candidate = { ...original, status: 'waiting_quota' };
  assert.match(h.html(), /Esperando cuota gratuita/);
  assert.doesNotMatch(h.html(), /animate-spin/);
  props.candidate = { ...original, status: 'adapted', adaptation: { title: 'Propuesta nueva', body: 'Texto adaptado', changes: 'Resumen' } };
  assert.match(h.html(), /Propuesta lista para revisar/);
  assert.doesNotMatch(h.html(), /Adaptación solicitada · En cola/);
  click('Solicitar otra adaptación');
  assert.doesNotMatch(h.html(), /Propuesta lista para revisar/, 'no presenta propuesta anterior como nueva mientras solicita otra');
  fail(new Error('No se pudo solicitar')); await new Promise(setImmediate);
  assert.equal(h.tree().props.error, 'No se pudo solicitar');
  assert.equal(h.tree().props.busy, false);
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Solicitar otra adaptación').props.disabled, false);
});

test('revisión por pasos guarda procedencia solo al confirmar y conserva motivo ante fallo', async () => {
  const candidate = { id: 'candidate', title: 'Noticia por revisar', original_text: 'Texto original de la noticia', source_url: 'https://example.org/noticia',
    author: 'Redacción', rights_status: 'uncertain', source_hash: 'hash-original', status: 'pending', item_id: null, adaptation: null };
  const calls = []; let changed = 0;
  const h = mount('src/pages/contenido/CandidateReview.tsx', 'CandidateReview', {
    '../../api/content': { reviewCandidate: async (...args) => { calls.push(args); if (calls.length === 1) throw new Error('No se pudo guardar'); } },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'),
  }, { candidate, onChanged() { changed++; }, onDraft() {}, onClose() {} });
  const button = label => h.find(n => n.type === 'button' && n.props.children === label);
  assert.equal(h.find(n => n.type === 'form'), undefined, 'solo se muestra procedencia al entrar');
  h.find(n => n.type === 'input' && n.props.value === 'own').props.onChange();
  assert.equal(calls.length, 0, 'seleccionar la procedencia no guarda automáticamente');
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Revisé los créditos y condiciones' } });
  button('Guardar procedencia').props.onClick();
  assert.equal(h.tree().props.busy, true);
  await new Promise(setImmediate);
  assert.equal(h.tree().props.error, 'No se pudo guardar');
  assert.equal(h.find(n => n.type === 'textarea').props.value, 'Revisé los créditos y condiciones');
  button('Guardar procedencia').props.onClick();
  await new Promise(setImmediate);
  assert.equal(calls[1][1], 'own'); assert.equal(calls[1][3], 'hash-original');
  assert.equal(changed, 1); assert.equal(h.find(n => n.type === 'textarea').props.value, '');
});

test('revisión mantiene texto al navegar, confirma reemplazo por IA y conserva borrador ante error', async () => {
  const candidate = { id: 'candidate', title: 'Título original', original_text: 'Texto original de la noticia', source_url: 'https://example.org/noticia',
    author: 'Redacción', rights_status: 'uncertain', source_hash: 'hash-original', status: 'adapted', item_id: null,
    adaptation: { title: 'Título adaptado', body: 'Texto propuesto para el borrador', unsuitable: true, changes: 'Resumen' } };
  let refreshes = 0, saves = 0, opened;
  const h = mount('src/pages/contenido/CandidateReview.tsx', 'CandidateReview', {
    '../../api/content': { createCandidateDraft: async (id, title, body) => {
      assert.equal(title, 'Título adaptado'); assert.equal(body, candidate.adaptation.body);
      if (++saves === 1) throw new Error('No se pudo crear'); return { id: 'draft', title };
    } }, '../../lib/contentMeta': load('src/lib/contentMeta.ts'),
  }, { candidate, onChanged() { refreshes++; }, onDraft(id) { opened = id; }, onClose() {} });
  const click = label => h.find(n => n.type === 'button' && n.props.children === label).props.onClick();
  click('Continuar a adaptación →');
  assert.match(h.html(), /La propuesta contiene advertencias/);
  click('Actualizar propuesta'); assert.equal(refreshes, 1);
  click('Preparar borrador manualmente →');
  assert.equal(h.find(n => n.type === 'textarea').props.value, candidate.original_text, 'IA no sustituye texto sin elegirla');
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Edición manual que no debe perderse' } });
  assert.equal(h.tree().props.dirty, true);
  h.find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[1] === 'Adaptación').props.onClick();
  click('Usar propuesta y revisar borrador →');
  assert.match(h.html(), /reemplazará el título y el texto/);
  click('Conservar mi texto');
  click('Preparar borrador manualmente →');
  assert.equal(h.find(n => n.type === 'textarea').props.value, 'Edición manual que no debe perderse');
  h.find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[1] === 'Adaptación').props.onClick();
  click('Usar propuesta y revisar borrador →'); click('Reemplazar con la propuesta');
  h.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.tree().props.error, 'No se pudo crear');
  assert.equal(h.find(n => n.type === 'textarea').props.value, candidate.adaptation.body);
  h.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.tree().props.dirty, false);
  assert.equal(h.find(n => n.type === 'form'), undefined);
  click('Ir al borrador →'); assert.equal(opened, 'draft');
});

test('importar JSON valida tamaño/formato y conserva la sesión del cliente', async () => {
  const calls = [];
  const api = load('src/api/content.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, options }); return new Response(JSON.stringify({ candidates: 1, duplicates: 0, changed: 0 }));
  } } });
  const file = text => ({ size: text.length, text: async () => text });
  await assert.rejects(api.importNewsFile(file('<html>No JSON</html>')), /JSON válido/);
  await assert.rejects(api.importNewsFile(file('[]')), /entre 1 y 100/);
  await assert.rejects(api.importNewsFile({ size: 3 * 1024 * 1024 }), /2 MB/);
  assert.equal(calls.length, 0);
  const news = [{ id: 123, title: { rendered: 'Una noticia' } }];
  await api.importNewsFile(file('\uFEFF' + JSON.stringify(news)));
  assert.equal(calls[0].path, '/content/candidates/import');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), news);
});

test('modal de importación conserva archivo ante fallo y solo informa éxito tras respuesta', async () => {
  let calls = 0, imported = 0;
  const h = mount('src/pages/contenido/ImportNewsModal.tsx', 'ImportNewsModal', {
    '../../api/content': { importNewsFile: async file => {
      assert.equal(file.name, 'noticias.json');
      if (++calls === 1) throw new Error('Archivo rechazado');
      return { candidates: 2, duplicates: 1, changed: 0 };
    } },
  }, { onClose() {}, onImported(result) { assert.equal(result.candidates, 2); imported++; } });
  const button = () => h.find(n => n.type === 'button' && n.props.children === 'Importar noticias');
  assert.equal(button().props.disabled, true);
  h.find(n => n.type === 'input').props.onChange({ target: { files: [{ name: 'noticias.json' }] } });
  assert.equal(h.tree().props.dirty, true);
  button().props.onClick();
  assert.equal(h.tree().props.busy, true);
  await new Promise(setImmediate);
  assert.match(h.html(), /Archivo rechazado/); assert.equal(imported, 0);
  assert.equal(button().props.disabled, false);
  button().props.onClick();
  await new Promise(setImmediate);
  assert.equal(imported, 1);
});

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

test('las pestañas conservan filtros y el borrador abre la gestión del contenido correcto', async () => {
  const calls = [];
  const Empty = () => null;
  const h = mount('src/pages/contenido/ContentPage.tsx', 'ContentPage', {
    '../../api/content': { fetchContent: async params => { calls.push(params); return { items: [], total: 0, page: 1, page_size: 25 }; } },
    '../../lib/format': { fmt: String }, './ContentDetail': { ContentDetail: Empty }, './ContentTable': { ContentTable: Empty },
    './NewContentForm': { NewContentForm: Empty }, './NewsCandidates': { NewsCandidates: Empty },
  });
  await h.settle();
  h.find(node => node.type === 'input').props.onChange({ target: { value: 'Consulta editorial' } });
  await new Promise(resolve => setTimeout(resolve, 430));
  await h.settle();
  h.find(node => node.type === 'button' && node.props.children === 'Preparar noticias').props.onClick();
  await h.settle();
  assert.equal(h.find(node => node.props?.id === 'content-prepare').props.hidden, false);
  h.find(node => node.type === 'button' && node.props.children === 'Gestionar contenido').props.onClick();
  await h.settle();
  assert.equal(h.find(node => node.type === 'input').props.value, 'Consulta editorial');
  assert.equal(calls.length, 2);
  h.find(node => node.props?.onDraft).props.onDraft('draft-1', 'Noticia adaptada');
  await h.settle();
  assert.equal(h.find(node => node.props?.id === 'content-manage').props.hidden, false);
  assert.equal(h.find(node => node.type === 'input').props.value, 'Noticia adaptada');
  assert.equal(calls.at(-1).page, 1);
  assert.equal(calls.at(-1).search, 'Noticia adaptada');
});

test('el aviso de preparación solo aparece tras aprobar y se oculta al editar el texto', () => {
  const item = { id: 'draft', title: 'Noticia editorial', body: 'Texto original por revisar', tags: [], type: 'news', status: 'draft',
    text_version: 2, approved_version: null, publish_at: null, updated_at: '2026-11-11', audio_available: false, audio_status: 'queued', provenance: null };
  const setup = item => mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': {}, '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() {}, onDeleted() {} });
  const pending = setup(item);
  assert.doesNotMatch(pending.html(), /Estamos preparando el audio/);
  assert.match(pending.html(), /El texto está pendiente de aprobación/);
  const approved = setup({ ...item, approved_version: 2 });
  assert.match(approved.html(), /Estamos preparando el audio/);
  approved.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Texto modificado que necesita aprobación' } });
  assert.doesNotMatch(approved.html(), /Estamos preparando el audio/);
  assert.match(approved.html(), /Guarda los cambios y después aprueba/);
});

test('el fallo al guardar conserva el texto y muestra el error sin habilitar la publicación', async () => {
  const item = { id: 'draft', title: 'Noticia editorial', body: 'Texto original por revisar', tags: [], type: 'news', status: 'draft',
    text_version: 1, approved_version: null, publish_at: null, updated_at: '2026-11-11', audio_available: false, audio_status: 'pending', provenance: null };
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { updateContent: async () => { throw new Error('No fue posible guardar el texto'); } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() {}, onDeleted() {} });
  h.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Texto que debe conservarse tras el error' } });
  h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.match(h.html(), /No fue posible guardar el texto/);
  assert.equal(h.find(node => node.type === 'textarea').props.value, 'Texto que debe conservarse tras el error');
  assert.equal(h.find(node => node.type === 'button' && node.props.children === 'Publicar ahora').props.disabled, true);
});

test('guardar borrador no programa y la fecha exige una confirmación separada', async () => {
  const item = { id: 'scheduled', title: 'Noticia aprobada', body: 'Texto aprobado con audio disponible', tags: [], type: 'news', status: 'draft',
    text_version: 1, approved_version: 1, publish_at: null, updated_at: '2026-11-11', audio_available: true, audio_status: 'ready', provenance: null };
  const date = '2026-12-12T15:30:00';
  let publishedPayload, changed;
  const saved = { ...item, tags: ['salud', 'familia'] };
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { updateContent: async (_id, payload) => { publishedPayload = payload; return { ...saved, publish_at: payload.publish_at ?? null }; } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged(value) { changed = value; }, onDeleted() {} });
  h.find(node => node.type === 'input' && node.props.value === '').props.onChange({ target: { value: 'salud,familia, ' } });
  assert.equal(h.tree().props.dirty, true);
  h.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(Object.hasOwn(publishedPayload, 'publish_at'), false);
  assert.equal(changed.publish_at, null);
  assert.equal(item.publish_at, null, 'la prueba conserva props antiguas para reproducir un GET lento');
  assert.equal(h.tree().props.dirty, false, 'el modal reconoce el guardado confirmado');
  assert.equal(h.tree().props.busy, false);
  assert.match(h.html(), /Borrador guardado/);
  h.find(node => node.type === 'input' && node.props.type === 'datetime-local').props.onChange({ target: { value: date } });
  assert.equal(h.find(node => node.type === 'button' && node.props.children === 'Programar publicación').props.disabled, false);
  h.find(node => node.type === 'button' && node.props.children === 'Programar publicación').props.onClick();
  await new Promise(setImmediate);
  assert.equal(Object.keys(publishedPayload).join(), 'publish_at');
  assert.equal(publishedPayload.publish_at, new Date(date).toISOString());
  assert.equal(h.tree().props.dirty, false);
  assert.match(h.html(), /Publicación programada/);
  assert.equal(h.find(node => node.type === 'button' && node.props.children === 'Publicar ahora').props.disabled, false);
  h.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Nueva modificación que todavía no se guarda' } });
  assert.equal(h.tree().props.dirty, true);
});

test('el servicio de edición devuelve los valores confirmados por el backend', async () => {
  const saved = { id: 'scheduled', publish_at: '2026-12-12T18:30:00Z', tags: ['salud'] };
  const api = load('src/api/content.ts', { './client': { apiFetch: async (_path, options) => {
    assert.equal(options.method, 'PATCH');
    return new Response(JSON.stringify(saved));
  } } });
  assert.equal(JSON.stringify(await api.updateContent(saved.id, { title: 'Texto', body: 'Contenido editorial', tags: saved.tags, publish_at: saved.publish_at })), JSON.stringify(saved));
});

test('programar exige aprobación, audio, fecha futura y texto guardado; cancelar conserva el borrador', async () => {
  const base = { id: 'draft', title: 'Noticia editorial', body: 'Contenido para publicar más adelante', tags: [], type: 'news', status: 'draft',
    text_version: 2, approved_version: 2, publish_at: null, updated_at: '2026-11-11', audio_available: true, audio_status: 'ready', provenance: null };
  function setup(overrides = {}) {
    let payload;
    const item = { ...base, ...overrides };
    const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
      '../../api/content': { updateContent: async (_id, value) => { payload = value; return { ...item, publish_at: value.publish_at }; } },
      '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
      '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
    }, { item, onChanged() {}, onDeleted() {} });
    return { h, payload: () => payload };
  }
  for (const item of [{ approved_version: null }, { audio_available: false }]) {
    const { h } = setup(item);
    assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Programar publicación').props.disabled, true);
    assert.equal(h.find(n => n.type === 'input' && n.props.type === 'datetime-local').props.disabled, true);
  }
  const { h } = setup();
  h.find(n => n.type === 'input' && n.props.type === 'datetime-local').props.onChange({ target: { value: '2020-01-01T10:00' } });
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Programar publicación').props.disabled, true);
  h.find(n => n.type === 'input' && n.props.type === 'datetime-local').props.onChange({ target: { value: '2026-12-12T15:30' } });
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Cambios que aún no se han guardado' } });
  assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Programar publicación').props.disabled, true);
  const existing = setup({ publish_at: '2026-12-12T18:30:00Z', approved_version: null, audio_available: false });
  assert.match(existing.h.html(), /la publicación está pendiente de nueva aprobación y audio vigente/);
  existing.h.find(n => n.type === 'button' && n.props.children === 'Cancelar programación').props.onClick();
  await new Promise(setImmediate);
  assert.equal(existing.payload().publish_at, null);
  assert.match(existing.h.html(), /Programación cancelada. El contenido continúa como borrador/);
});

test('una noticia archivada no permite programar fecha, pero guarda etiquetas sin enviar programación', async () => {
  const item = { id: 'archived', title: 'Noticia archivada', body: 'Texto aprobado con audio disponible', tags: [], type: 'news', status: 'archived',
    text_version: 1, approved_version: 1, publish_at: '2026-12-12T18:30:00Z', updated_at: '2026-11-11', audio_available: true, audio_status: 'ready', provenance: null };
  let payload;
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { updateContent: async (_id, data) => { payload = data; return { ...item, tags: ['cientifica'] }; } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() {}, onDeleted() {} });
  assert.equal(h.find(n => n.type === 'input' && n.props.type === 'datetime-local'), undefined);
  assert.match(h.html(), /Este contenido está archivado. Solo los borradores admiten una fecha programada/);
  h.find(n => n.type === 'input' && n.props.value === '').props.onChange({ target: { value: 'cientifica' } });
  h.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(Object.hasOwn(payload, 'publish_at'), false);
  assert.equal(h.tree().props.dirty, false);
  assert.match(h.html(), /Cambios guardados/);
});

test('publicar ahora confirma que se elimina la programación, cancelar no envía y un fallo conserva confirmación', async () => {
  const item = { id: 'scheduled', title: 'Noticia programada', body: 'Texto editorial aprobado', tags: [], type: 'news', status: 'draft',
    text_version: 1, approved_version: 1, publish_at: '2026-12-12T18:30:00Z', updated_at: '2026-11-11', audio_available: true, audio_status: 'ready', provenance: null };
  let attempts = 0, changed = 0, closed = 0;
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { changeContentPublication: async (id, unpublish) => {
      assert.equal(id, item.id); assert.equal(unpublish, false);
      if (++attempts === 1) throw new Error('No fue posible publicar');
    } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() { changed++; }, onDeleted() {}, onClose() { closed++; } });
  const click = label => h.find(n => n.type === 'button' && n.props.children === label).props.onClick();
  click('Publicar ahora');
  assert.equal(attempts, 0);
  assert.match(h.html(), /2026-12-12T18:30:00Z/);
  assert.match(h.html(), /se eliminará esa programación/);
  click('Volver y conservar programación');
  assert.equal(attempts, 0);
  assert.equal(closed, 0);
  assert.equal(item.publish_at, '2026-12-12T18:30:00Z');
  click('Publicar ahora');
  click('Confirmar y publicar ahora');
  assert.equal(h.tree().props.busy, true);
  await new Promise(setImmediate);
  assert.match(h.html(), /No fue posible publicar/);
  assert.equal(changed, 0);
  assert.equal(closed, 0);
  click('Confirmar y publicar ahora');
  await new Promise(setImmediate);
  assert.equal(attempts, 2);
  assert.equal(changed, 1);
  assert.equal(closed, 1, 'publicar correctamente vuelve al listado; cancelar o fallar conserva el modal');
});

test('programar sin audio exige fecha motivo y revisión, conserva errores y permite cancelar la programación', async () => {
  const original = { id: 'optional', title: 'Noticia revisada', body: 'Texto aprobado para lectura', tags: [], type: 'news', status: 'draft',
    text_version: 1, approved_version: 1, publish_at: null, updated_at: '2026-11-17',
    audio_available: false, audio_status: 'failed', audio_error: 'INVALID_AUDIO_OUTPUT', provenance: null };
  let attempts = 0, closed = 0, payload, cancelled;
  const props = { item: original, onChanged(saved) { if (saved) props.item = saved; }, onDeleted() {}, onClose() { closed++; } };
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': {
      scheduleContentWithoutAudio: async (id, version, reason, confirmed, date) => {
        payload = { id, version, reason, confirmed, date };
        if (++attempts === 1) throw new Error('No se pudo programar');
        return { ...original, publish_at: date, scheduled_without_audio: true, scheduled_audio_exception_reason: reason };
      },
      updateContent: async (_id, value) => { cancelled = value; return { ...original, publish_at: null, scheduled_without_audio: false }; },
    },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, props);
  const button = label => h.find(n => n.type === 'button' && n.props.children === label);
  assert.equal(h.find(n => n.type === 'input' && n.props.type === 'datetime-local').props.disabled, false);
  assert.equal(button('Programar sin audio').props.disabled, true);
  h.find(n => n.type === 'input' && n.props.type === 'datetime-local').props.onChange({ target: { value: '2026-12-12T15:30' } });
  assert.equal(button('Programar sin audio').props.disabled, false);
  button('Programar sin audio').props.onClick();
  assert.match(h.html(), /Si el audio está listo, se incluirá/);
  assert.equal(attempts, 0);
  assert.equal(button('Confirmar y programar sin audio').props.disabled, true);
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Audio fallido; texto revisado para la fecha elegida.' } });
  h.find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  button('Volver sin programar').props.onClick();
  assert.equal(attempts, 0);
  button('Programar sin audio').props.onClick();
  button('Confirmar y programar sin audio').props.onClick();
  await new Promise(setImmediate);
  assert.match(h.html(), /No se pudo programar/);
  assert.match(h.find(n => n.type === 'textarea').props.value, /Audio fallido/);
  assert.equal(closed, 0);
  button('Confirmar y programar sin audio').props.onClick();
  await new Promise(setImmediate);
  assert.equal(attempts, 2); assert.equal(payload.version, 1); assert.equal(payload.confirmed, true);
  assert.equal(payload.date, new Date('2026-12-12T15:30').toISOString());
  assert.equal(h.tree().props.dirty, false);
  assert.match(h.html(), /Se publicará aunque falte el audio/);
  button('Cancelar programación').props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(JSON.stringify(cancelled)), { publish_at: null });
  assert.equal(props.item.scheduled_without_audio, false);
});

test('el servicio programa sin audio enviando fecha UTC y autorización explícita', async () => {
  let path, options;
  const api = load('src/api/content.ts', { './client': { apiFetch: async (url, config) => {
    path = url; options = config; return { ok: true, json: async () => ({ status: 'draft', scheduled_without_audio: true }) };
  } } });
  await api.scheduleContentWithoutAudio('id', 2, 'Texto revisado tras fallo.', true, '2026-12-12T18:30:00Z');
  assert.equal(path, '/content/items/id/schedule-without-audio');
  assert.deepEqual(JSON.parse(options.body), { version: 2, reason: 'Texto revisado tras fallo.', review_confirmed: true, publish_at: '2026-12-12T18:30:00Z' });
});

test('publicar sin audio exige motivo y revisión, conserva formulario ante error y vuelve al listado al publicar', async () => {
  const item = { id: 'failed-audio', title: 'Noticia revisada', body: 'Texto aprobado para lectura', tags: [], type: 'news', status: 'draft',
    text_version: 2, approved_version: 2, publish_at: '2026-12-12T18:30:00Z', updated_at: '2026-11-17',
    audio_available: false, audio_status: 'failed', audio_error: 'AUDIO_CONTENT_BLOCKED', provenance: null };
  let attempts = 0, closed = 0, changed = 0;
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { publishContentWithoutAudio: async (id, version, reason, confirmed) => {
      assert.equal(id, item.id); assert.equal(version, 2); assert.equal(reason, 'El texto se revisó y se publicará para lectura.'); assert.equal(confirmed, true);
      if (++attempts === 1) throw new Error('No se pudo publicar');
    } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() { changed++; }, onDeleted() {}, onClose() { closed++; } });
  const button = label => h.find(n => n.type === 'button' && n.props.children === label);
  button('Publicar sin audio').props.onClick();
  assert.equal(attempts, 0);
  assert.match(h.html(), /Se eliminará la programación/);
  assert.equal(button('Confirmar y publicar sin audio').props.disabled, true);
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'El texto se revisó y se publicará para lectura.' } });
  assert.equal(button('Confirmar y publicar sin audio').props.disabled, true);
  h.find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  assert.equal(button('Confirmar y publicar sin audio').props.disabled, false);
  button('Volver sin publicar').props.onClick();
  assert.equal(attempts, 0);
  button('Publicar sin audio').props.onClick();
  assert.match(h.find(n => n.type === 'textarea').props.value, /El texto se revisó/);
  button('Confirmar y publicar sin audio').props.onClick();
  await new Promise(setImmediate);
  assert.match(h.html(), /No se pudo publicar/);
  assert.equal(closed, 0); assert.equal(changed, 0);
  assert.match(h.find(n => n.type === 'textarea').props.value, /El texto se revisó/);
  button('Confirmar y publicar sin audio').props.onClick();
  await new Promise(setImmediate);
  assert.equal(attempts, 2); assert.equal(closed, 1); assert.equal(changed, 1);
});

test('la excepción no aparece para audio pendiente, en proceso, sin fallo o texto sin aprobar', () => {
  const base = { id: 'not-ready', title: 'Noticia', body: 'Texto revisado', tags: [], type: 'news', status: 'draft', text_version: 1,
    approved_version: 1, publish_at: null, updated_at: '2026-11-17', audio_available: false, audio_error: 'INVALID_AUDIO_OUTPUT', provenance: null };
  for (const changes of [{ audio_status: 'pending' }, { audio_status: 'queued' }, { audio_status: 'waiting_quota' },
    { audio_status: 'failed', audio_error: null }, { audio_status: 'failed', approved_version: null }]) {
    const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
      '../../api/content': {}, '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) },
      '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
    }, { item: { ...base, ...changes }, onChanged() {}, onDeleted() {} });
    assert.equal(h.find(n => n.type === 'button' && n.props.children === 'Publicar sin audio'), undefined);
  }
});

test('el servicio de publicación sin audio envía versión motivo y revisión explícitos', async () => {
  let path, options;
  const api = load('src/api/content.ts', { './client': { apiFetch: async (url, config) => {
    path = url; options = config; return { ok: true, json: async () => ({ status: 'published', audio_available: false }) };
  } } });
  await api.publishContentWithoutAudio('content-id', 3, 'Audio fallido y texto revisado.', true);
  assert.equal(path, '/content/items/content-id/publish-without-audio');
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), { version: 3, reason: 'Audio fallido y texto revisado.', review_confirmed: true });
});

test('eliminar exige confirmación interna, cancelar conserva edición y un fallo permite reintentar', async () => {
  const item = { id: 'archived', title: 'Noticia para eliminar', body: 'Texto que se conserva en el historial', tags: [], type: 'news', status: 'archived',
    text_version: 1, approved_version: 1, publish_at: null, updated_at: '2026-11-11', audio_available: true, audio_status: 'ready', provenance: null };
  let attempts = 0, deleted = 0;
  const h = mount('src/pages/contenido/ContentDetail.tsx', 'ContentDetail', {
    '../../api/content': { deleteContent: async () => { if (++attempts === 1) throw new Error('No fue posible eliminar'); } },
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'admin' } }) },
    '../../lib/contentMeta': load('src/lib/contentMeta.ts'), '../../lib/format': { ticketDate: String },
  }, { item, onChanged() {}, onDeleted() { deleted++; } });
  h.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Edición pendiente que no debe perderse al cancelar' } });
  h.find(n => n.type === 'button' && n.props.children === 'Eliminar').props.onClick();
  assert.equal(attempts, 0);
  assert.match(h.html(), /no podrás restaurarlo desde esta consola/);
  assert.match(h.html(), /También se descartarán los cambios/);
  h.find(n => n.type === 'button' && n.props.children === 'Cancelar eliminación').props.onClick();
  assert.equal(h.find(n => n.type === 'textarea').props.value, 'Edición pendiente que no debe perderse al cancelar');
  h.find(n => n.type === 'button' && n.props.children === 'Eliminar').props.onClick();
  h.find(n => n.type === 'button' && n.props.children === 'Confirmar eliminación').props.onClick();
  await new Promise(setImmediate);
  assert.equal(deleted, 0);
  assert.match(h.html(), /No fue posible eliminar/);
  h.find(n => n.type === 'button' && n.props.children === 'Confirmar eliminación').props.onClick();
  await new Promise(setImmediate);
  assert.equal(attempts, 2);
  assert.equal(deleted, 1);
});

test('el audio se actualiza sin guardar y la consulta automática se pausa durante la edición', async () => {
  let ready = false, calls = 0, id = 0;
  const timers = new Map(), listeners = new Map();
  const browser = { window: { setTimeout: (fn, ms) => { assert.equal(ms, 5000); timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id) },
    document: { visibilityState: 'visible', addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) } };
  const item = { id: 'audio', title: 'Noticia', tags: [], text_version: 1, approved_version: 1, audio_status: 'queued', updated_at: 'inicial' };
  const Empty = () => null;
  const h = mount('src/pages/contenido/ContentPage.tsx', 'ContentPage', {
    '../../api/content': { fetchContent: async () => { calls++; return { items: [{ ...item, audio_status: ready ? 'ready' : 'queued', audio_available: ready, updated_at: ready ? 'actualizado' : 'inicial' }], total: 1, page: 1, page_size: 25 }; } },
    '../../lib/format': { fmt: String }, './ContentDetail': { ContentDetail: Empty }, './ContentTable': { ContentTable: Empty },
    './NewContentForm': { NewContentForm: Empty }, './NewsCandidates': { NewsCandidates: Empty },
  }, {}, browser);
  await h.settle(); await h.settle();
  h.find(node => node.props?.onSelect).props.onSelect('audio'); await h.settle();
  const key = h.find(node => node.props?.item).key;
  assert.equal(timers.size, 1);
  h.find(node => node.props?.onEditingChange).props.onEditingChange(true); await h.settle();
  assert.equal(timers.size, 0);
  h.find(node => node.props?.onEditingChange).props.onEditingChange(false); await h.settle();
  ready = true;
  timers.values().next().value();
  await h.settle(); await h.settle();
  assert.equal(h.find(node => node.props?.item).props.item.audio_available, true);
  assert.equal(h.find(node => node.props?.item).key, key, 'la actualización del audio no remonta el editor');
  assert.equal(timers.size, 0);
  assert.equal(calls, 2);
});
