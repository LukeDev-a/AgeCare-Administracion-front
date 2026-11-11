const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}, globals = {}) {
  const context = { exports: {}, Error, URLSearchParams, require: name => dependencies[name]
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
  h.find(node => node.type === 'button' && node.props.children === 'Buscar').props.onClick();
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
  assert.equal(h.find(node => node.type === 'button' && node.props.children === 'Publicar').props.disabled, true);
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
  assert.equal(h.find(node => node.type === 'button' && node.props.children === 'Publicar').props.disabled, false);
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
