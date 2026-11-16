const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, URL, URLSearchParams, require: name => dependencies[name]
    ?? require('./helpers/filter-hooks.cjs').filterDependency(name, dependencies.react)
    ?? (name === './marketStyles' ? load('src/pages/marketplace/marketStyles.ts') : name === '../../components/Modal' ? load('src/components/Modal.tsx') : require(name)) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const permissions = load('src/routes/permissions.ts');
const meta = { MARKET_STATUS_META: { draft: { label: 'Borrador' }, published: { label: 'Publicado' }, archived: { label: 'Archivado' } } };
const common = { '../../routes/permissions': permissions, '../../lib/marketMeta': meta,
  '../../lib/format': { fmt: String, money: value => `${value} CLP`, ticketDate: String },
  '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'editor' } }) } };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(path, name, dependencies, props = {}) {
  const states = [], effects = [], previous = [], cleanups = [];
  let si = 0, ei = 0;
  const hooks = { ...React, useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
    return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, values) { const i = ei++; if (!previous[i] || values.some((value, j) => value !== previous[i][j])) {
      previous[i] = values; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
    } },
  };
  const component = load(path, { ...common, ...dependencies, react: hooks })[name];
  const tree = () => { si = 0; ei = 0; return component(props); };
  return { tree, html: () => renderToStaticMarkup(tree()), find: predicate => find(tree(), predicate),
    async settle() { tree(); effects.splice(0).forEach(fn => fn()); await new Promise(setImmediate); } };
}
const product = { id: 'id', name: 'Artículo de prueba', category: 'Bienestar', vendor: 'Proveedor', price_clp: 0,
  external_url: 'https://example.cl/articulo', image_url: 'https://example.cl/imagen.png', status: 'draft', updated_at: '2026-10-27T15:00:00Z' };

test('crear artículo rechaza texto vacío o enlace inválido y permite omitir precio e imagen', async () => {
  const calls = [];
  const form = mount('src/pages/marketplace/NewProductForm.tsx', 'NewProductForm', {
    '../../api/marketplace': { createProduct: async payload => calls.push(payload) },
  }, { onCreated() {}, onCancel() {} });
  const fill = (name, value) => form.find(n => n.type === 'input' && n.props.name === name).props.onChange({ target: { value } });
  const submit = async () => { form.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate); };
  fill('name', '   '); await submit();
  assert.equal(calls.length, 0); assert.match(form.tree().props.error, /El nombre debe tener/);
  fill('name', ' Producto válido '); fill('category', ' Bienestar '); fill('vendor', ' Proveedor ');
  fill('external_url', 'http://example.org/producto'); await submit();
  assert.equal(calls.length, 0); assert.match(form.tree().props.error, /HTTPS válida/);
  fill('external_url', 'https://example.org/producto'); await submit();
  assert.equal(calls[0].name, 'Producto válido'); assert.equal(calls[0].category, 'Bienestar');
  assert.equal(Object.hasOwn(calls[0], 'price_clp'), false); assert.equal(Object.hasOwn(calls[0], 'image_url'), false);
  fill('price_clp', '0'); await submit(); assert.equal(calls[1].price_clp, 0);
});

test('productos: filtros/página y PATCH parcial conservan null explícito', async () => {
  const calls = [];
  const api = load('src/api/marketplace.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, body: options?.body && JSON.parse(options.body) }); return new Response('{}');
  } } });
  await api.fetchProducts({ page: 2, search: 'Proveedor', category: 'Bienestar', status: 'draft' });
  const params = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(params.get('page'), '2'); assert.equal(params.get('category'), 'Bienestar'); assert.equal(params.get('q'), 'Proveedor');
  await api.updateProduct('id', { price_clp: null, image_url: null });
  assert.deepEqual(calls[1].body, { price_clp: null, image_url: null });
});

test('detalle distingue cero, permite borrar opcionales y publica mediante PATCH de estado', async () => {
  const patches = [];
  const detail = mount('src/pages/marketplace/ProductDetail.tsx', 'ProductDetail', { '../../api/marketplace': {
    updateProduct: async (_id, patch) => patches.push(patch),
  } }, { product, onChanged() {} });
  assert.match(detail.html(), /0 CLP/); assert.match(detail.html(), /<img/); assert.match(detail.html(), /ID: id/);
  assert.doesNotMatch(detail.html(), />Archivar</);
  await detail.find(node => node.type === 'button' && node.props.children === 'Publicar').props.onClick();
  await new Promise(setImmediate); assert.equal(JSON.stringify(patches[0]), JSON.stringify({ status: 'published' }));
  detail.find(node => node.type === 'input' && node.props.type === 'number').props.onChange({ target: { value: '' } });
  detail.find(node => node.type === 'input' && node.props.value === product.image_url).props.onChange({ target: { value: '' } });
  assert.equal(detail.find(node => node.type === 'button' && node.props.children === 'Archivar').props.disabled, true);
  await detail.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(JSON.stringify(patches[1]), JSON.stringify({ price_clp: null, image_url: null }));
});

test('lectura muestra precio no informado; publicado admite borrador/archivo y archivado no se republica', () => {
  const { ProductDetail } = load('src/pages/marketplace/ProductDetail.tsx', { ...common, '../../api/marketplace': {} });
  for (const [status, expected] of [['draft', ['Publicar']], ['published', ['Volver a borrador', 'Archivar']], ['archived', ['Restaurar a borrador']]]) {
    const html = renderToStaticMarkup(React.createElement(ProductDetail, { product: { ...product, status }, onChanged() {} }));
    for (const action of ['Publicar', 'Volver a borrador', 'Archivar', 'Restaurar a borrador']) assert.equal(html.includes(`>${action}</button>`), expected.includes(action));
  }
  const { ProductsTable } = load('src/pages/marketplace/ProductsTable.tsx', common);
  const html = renderToStaticMarkup(React.createElement(ProductsTable, { items: [{ ...product, price_clp: null }], onSelect() {} }));
  assert.match(html, /Precio no informado/);
});

test('restaurar archivado envía solo draft, requiere guardar edición y no aparece para moderator', async () => {
  const patches = [];
  const detail = mount('src/pages/marketplace/ProductDetail.tsx', 'ProductDetail', { '../../api/marketplace': {
    updateProduct: async (_id, patch) => patches.push(patch),
  } }, { product: { ...product, status: 'archived' }, onChanged() {} });
  const button = () => detail.find(node => node.type === 'button' && node.props.children === 'Restaurar a borrador');
  assert.equal(button().props.disabled, false);
  await button().props.onClick(); await new Promise(setImmediate);
  assert.equal(JSON.stringify(patches[0]), JSON.stringify({ status: 'draft' }));
  detail.find(node => node.type === 'input' && node.props.value === product.name).props.onChange({ target: { value: 'Cambio sin guardar' } });
  assert.equal(detail.find(node => node.type === 'button' && node.props.children === 'Publicar').props.disabled, true);
  const { ProductDetail } = load('src/pages/marketplace/ProductDetail.tsx', { ...common, '../../api/marketplace': {},
    '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'moderator' } }) } });
  const html = renderToStaticMarkup(React.createElement(ProductDetail, { product: { ...product, status: 'archived' }, onChanged() {} }));
  assert.doesNotMatch(html, /Restaurar a borrador/);
});

test('listado aplica filtros combinados, pagina y descarta respuesta anterior', async () => {
  const requests = [];
  const panel = mount('src/pages/marketplace/ProductsPanel.tsx', 'ProductsPanel', {
    '../../api/marketplace': { fetchProducts: params => new Promise(resolve => requests.push({ params, resolve })) },
    './NewProductForm': { NewProductForm: () => null }, './ProductDetail': { ProductDetail: () => null }, './ProductsTable': { ProductsTable: () => null },
  });
  await panel.settle();
  panel.find(node => node.props?.['aria-label'] === 'Filtrar por categoría').props.onChange({ target: { value: 'Bienestar' } });
  panel.find(node => node.props?.['aria-label'] === 'Buscar productos').props.onChange({ target: { value: 'Proveedor' } });
  await new Promise(resolve => setTimeout(resolve, 430));
  await panel.settle();
  assert.equal(requests.at(-1).params.category, 'Bienestar'); assert.equal(requests.at(-1).params.search, 'Proveedor');
  requests.at(-1).resolve({ items: [], page: 1, page_size: 25, total: 30 }); await new Promise(setImmediate);
  requests[0].resolve({ items: [], page: 1, page_size: 25, total: 999 }); await new Promise(setImmediate);
  assert.doesNotMatch(panel.html(), /999 productos/);
  panel.find(node => node.type === 'button' && node.props.children === 'Siguiente').props.onClick();
  await panel.settle(); assert.equal(requests.at(-1).params.page, 2);
  panel.find(node => node.props?.['aria-label'] === 'Filtrar productos').props.onChange({ target: { value: 'published' } });
  await panel.settle(); assert.equal(requests.at(-1).params.page, 1); assert.equal(requests.at(-1).params.category, 'Bienestar');
});

test('guardado usa respuesta confirmada, limpia dirty y conserva una nueva edición si falla', async () => {
  let fail = false;
  const detail = mount('src/pages/marketplace/ProductDetail.tsx', 'ProductDetail', { '../../api/marketplace': {
    updateProduct: async (_id, patch) => { if (fail) throw new Error('Error de guardado'); return { ...product, ...patch, name: patch.name.trim() }; },
  } }, { product, onChanged() {} });
  detail.find(node => node.type === 'input' && node.props.value === product.name).props.onChange({ target: { value: '  Nombre confirmado  ' } });
  assert.equal(detail.tree().props.dirty, true);
  await detail.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(detail.tree().props.dirty, false);
  assert.ok(detail.find(node => node.type === 'input' && node.props.value === 'Nombre confirmado'));
  fail = true;
  detail.find(node => node.type === 'input' && node.props.value === 'Nombre confirmado').props.onChange({ target: { value: 'Nueva edición' } });
  await detail.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(setImmediate);
  assert.equal(detail.tree().props.dirty, true);
  assert.equal(detail.tree().props.error, 'Error de guardado');
  assert.ok(detail.find(node => node.type === 'input' && node.props.value === 'Nueva edición'));
});

test('cuidadoras: nota independiente usa respuesta guardada, conserva edición ante fallo y permite vaciar', async () => {
  const calls = [];
  const profile = { caregiver_id: 'c1', name: 'Ana', zone: 'Centro', languages: [], specialties: [], certifications_count: 1,
    certifications_verified: false, reviews_count: 0, rating_avg: null, status: 'pending', internal_note: 'Nota previa' };
  const api = load('src/api/caregivers.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ ...profile, internal_note: 'Respuesta confirmada' }));
  } } });
  assert.equal((await api.updateCaregiverNote('c1', 'Nota nueva')).internal_note, 'Respuesta confirmada');
  assert.deepEqual(calls[0].body, { internal_note: 'Nota nueva' });
  let attempts = 0;
  const h = mount('src/pages/marketplace/CaregiverDetail.tsx', 'CaregiverDetail', {
    '../../api/caregivers': { updateCaregiverNote: async (id, note) => {
      assert.equal(id, 'c1'); if (++attempts === 1) throw new Error('No se pudo guardar la nota');
      return { ...profile, internal_note: note };
    } }, '../../lib/caregiverMeta': { CAREGIVER_STATUS_META: { pending: { label: 'Pendiente' } } },
  }, { caregiver: profile, onChanged() {} });
  const note = () => h.find(n => n.type === 'textarea');
  const save = () => h.find(n => n.type === 'button' && n.props.children === 'Guardar nota interna');
  assert.equal(note().props.value, 'Nota previa'); assert.equal(save().props.disabled, true);
  note().props.onChange({ target: { value: 'Una nota que debe conservarse' } });
  assert.equal(h.tree().props.dirty, true);
  save().props.onClick(); assert.equal(h.tree().props.busy, true);
  await new Promise(setImmediate);
  assert.equal(h.tree().props.error, 'No se pudo guardar la nota');
  assert.equal(note().props.value, 'Una nota que debe conservarse');
  save().props.onClick(); await new Promise(setImmediate);
  assert.equal(h.tree().props.dirty, false);
  assert.equal(save().props.disabled, true);
  note().props.onChange({ target: { value: '' } });
  save().props.onClick(); await new Promise(setImmediate);
  assert.equal(h.tree().props.dirty, false); assert.equal(note().props.value, '');
});

test('cuidadoras: moderator no ve ni edita las notas internas aunque lleguen en props', () => {
  const profile = { caregiver_id: 'c1', name: 'Ana', zone: 'Centro', languages: [], specialties: [], certifications_count: 1,
    certifications_verified: true, reviews_count: 0, rating_avg: null, status: 'pending', internal_note: 'NOTA_PRIVADA_NO_MOSTRAR' };
  const h = mount('src/pages/marketplace/CaregiverDetail.tsx', 'CaregiverDetail', {
    '../../api/caregivers': {}, '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'moderator' } }) },
    '../../lib/caregiverMeta': { CAREGIVER_STATUS_META: { pending: { label: 'Pendiente' } } },
  }, { caregiver: profile, onChanged() {} });
  assert.doesNotMatch(h.html(), /NOTA_PRIVADA_NO_MOSTRAR|Guardar nota interna/);
});

test('cuidadoras: cantidad registrada no permite aprobar sin verificación explícita', async () => {
  for (const value of [false, undefined, true]) {
    const calls = [];
    const profile = { caregiver_id: 'c1', name: 'Ana', zone: 'Centro', languages: [], specialties: [],
      certifications_count: 1, certifications_verified: value, reviews_count: 0, rating_avg: null, status: 'pending' };
    const detail = mount('src/pages/marketplace/CaregiverDetail.tsx', 'CaregiverDetail', {
      '../../api/caregivers': { updateCaregiverStatus: async (...args) => calls.push(args) },
      '../../lib/caregiverMeta': { CAREGIVER_STATUS_META: { pending: { label: 'Pendiente' } } },
    }, { caregiver: profile, onChanged() {} });
    const approve = detail.find(n => n.type === 'button' && n.props.children === 'Aprobar');
    assert.equal(approve.props.disabled, value !== true);
    assert.match(detail.html(), value === true ? /Certificaciones verificadas/ : value === false ? /Pendiente de verificación/ : /Sin información de verificación/);
    approve.props.onClick();
    if (value !== true) {
      assert.equal(detail.find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.join('') === 'Confirmar aprobación'), undefined);
    } else {
      detail.find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.join('') === 'Confirmar aprobación').props.onClick();
      await new Promise(setImmediate);
      assert.deepEqual(calls[0], ['c1', 'approved', undefined]);
    }
  }
});

test('cuidadoras: suspensión exige confirmación/motivo y servicio admite paginación', async () => {
  const requests = [];
  const api = load('src/api/caregivers.ts', { './client': { apiFetch: async (path, options) => {
    requests.push({ path, body: options?.body && JSON.parse(options.body) }); return new Response('{}');
  } } });
  await api.fetchCaregivers({ search: 'Ana', status: 'pending', page: 2 });
  assert.equal(new URLSearchParams(requests[0].path.split('?')[1]).get('page'), '2');
  await api.updateCaregiverStatus('c1', 'suspended', 'Documentación incompleta.');
  assert.equal(requests[1].body.reason, 'Documentación incompleta.');
  const changes = [];
  const profile = { caregiver_id: 'c1', name: 'Ana', zone: 'Centro', languages: ['Español'], specialties: [], certifications_count: 1, reviews_count: 0, rating_avg: null, status: 'approved' };
  const detail = mount('src/pages/marketplace/CaregiverDetail.tsx', 'CaregiverDetail', {
    '../../api/caregivers': { updateCaregiverStatus: async (...args) => changes.push(args) },
    '../../lib/caregiverMeta': { CAREGIVER_STATUS_META: { approved: { label: 'Aprobada' }, suspended: { label: 'Suspendida' } } },
  }, { caregiver: profile, onChanged() {} });
  detail.find(node => node.type === 'button' && node.props.children === 'Suspender').props.onClick();
  assert.equal(changes.length, 0);
  const confirm = () => detail.find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.join('') === 'Confirmar suspensión');
  assert.equal(confirm().props.disabled, true);
  detail.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Documentación incompleta.' } });
  assert.equal(confirm().props.disabled, false);
  confirm().props.onClick(); await new Promise(setImmediate);
  assert.deepEqual(changes[0], ['c1', 'suspended', 'Documentación incompleta.']);
  assert.equal(detail.tree().props.dirty, false);
});
