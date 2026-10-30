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
  const hooks = { ...React, useState(initial) { const i = si++; if (!(i in states)) states[i] = initial;
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
  assert.equal(detail.find(node => node.type === 'button' && node.props.children === 'Publicar').props.disabled, true);
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
  assert.equal(button().props.disabled, true);
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
  panel.find(node => node.type === 'button' && node.props.children === 'Buscar').props.onClick();
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
