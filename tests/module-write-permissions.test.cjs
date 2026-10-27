const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(path, dependencies = {}) {
  const context = { exports: {}, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const permissions = load('src/routes/permissions.ts');
const format = { fmt: String, ticketDate: value => value };
const empty = () => null;
const roles = ['admin', 'analyst', 'support', 'editor', 'moderator', undefined, 'desconocido'];
const ticket = { id: 'ticket-test', number: 10, subject: 'Solicitud de prueba', description: 'Descripción visible',
  requester: { name: 'Solicitante', email: 'test@example.org', role: 'family' }, category: 'other', priority: 'medium',
  status: 'open', replies_count: 1, assigned_to: { admin_id: 'agent', name: 'Responsable visible' }, created_at: '2026-10-26' };
const product = { id: 'product', name: 'Producto visible', category: 'Bienestar', vendor: 'Proveedor visible',
  status: 'draft', price_clp: 0, external_url: 'https://example.org/producto', image_url: null };
const caregiver = { caregiver_id: 'caregiver', name: 'Cuidadora visible', zone: 'Centro', languages: ['Español'],
  specialties: ['Acompañamiento'], certifications_count: 1, reviews_count: 2, rating_avg: 4, status: 'pending' };

function deps(role) {
  return { '../../auth/AuthContext': { useAuth: () => ({ user: role ? { role } : null }) },
    '../../routes/permissions': permissions, '../../lib/format': format };
}

// Montaje lógico con estado/efectos controlados para resolver consultas simuladas.
// El markup se genera con React; no simula ni certifica un navegador real.
function mount(path, exportName, dependencies, props = {}) {
  const states = [], effects = [], lastDeps = [];
  let stateIndex = 0, effectIndex = 0;
  const hooks = { ...React,
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(callback, values) {
      const index = effectIndex++;
      if (!lastDeps[index] || values.some((value, i) => value !== lastDeps[index][i])) {
        lastDeps[index] = values;
        effects.push(callback);
      }
    },
  };
  const component = load(path, { ...dependencies, react: hooks })[exportName];
  function tree() { stateIndex = 0; effectIndex = 0; return component(props); }
  return {
    tree,
    html: () => renderToStaticMarkup(tree()),
    async settle() { tree(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate); },
  };
}

test('tickets: solo admin/support crean, cambian estado, asignan y responden; analyst conserva detalle y notas', async () => {
  for (const role of roles) {
    const allowed = role === 'admin' || role === 'support';
    const calls = [];
    const api = { fetchTicketDetail: async () => ticket,
      fetchTicketReplies: async () => [{ author_name: 'Agente', created_at: '2026-10-26', internal: true, body: 'Nota de consulta' }],
      fetchAgents: async () => { calls.push('agents'); return [{ id: 'agent', full_name: 'Responsable visible' }]; } };
    const detail = mount('src/pages/tickets/TicketDetail.tsx', 'TicketDetail', { ...deps(role),
      '../../api/tickets': api, '../../lib/roleMeta': { roleLabel: String },
      '../../lib/ticketMeta': { TICKET_STATUS_META: { open: { label: 'Abierto' } },
        TICKET_PRIORITY_META: { medium: { label: 'Media' } }, TICKET_CATEGORY_NAMES: {} },
    }, { ticketId: ticket.id, onTicketUpdated() {} });
    await detail.settle();
    const html = detail.html();
    for (const action of ['Cambiar estado', 'Asignar agente', 'Guardar cambios', 'Enviar respuesta', '<textarea']) {
      assert.equal(html.includes(action), allowed, `${role}: ${action}`);
    }
    assert.ok(html.includes('Descripción visible') && html.includes('Responsable visible'));
    assert.ok(html.includes('Nota de consulta') && html.includes('Nota interna'));
    assert.equal(calls.length, allowed ? 1 : 0, `${role}: no consulta agentes en lectura`);
    const { TicketsPage } = load('src/pages/tickets/TicketsPage.tsx', { ...deps(role),
      '../../api/tickets': {}, './NewTicketForm': { NewTicketForm: empty },
      './TicketDetail': { TicketDetail: empty }, './TicketsTable': { TicketsTable: empty } });
    assert.equal(renderToStaticMarkup(React.createElement(TicketsPage)).includes('Crear ticket'), allowed);
    const { NewTicketForm } = load('src/pages/tickets/NewTicketForm.tsx', { ...deps(role), '../../api/tickets': {} });
    assert.equal(renderToStaticMarkup(React.createElement(NewTicketForm, { onCreated() {}, onCancel() {} })).includes('<form'), allowed);
  }
});

test('marketplace: solo admin/editor gestionan; moderator conserva consulta de productos y cuidadoras', () => {
  for (const role of roles) {
    const allowed = role === 'admin' || role === 'editor';
    const { ProductsPanel } = load('src/pages/marketplace/ProductsPanel.tsx', { ...deps(role),
      '../../api/marketplace': {}, './NewProductForm': { NewProductForm: empty },
      './ProductDetail': { ProductDetail: empty }, './ProductsTable': { ProductsTable: empty } });
    assert.equal(renderToStaticMarkup(React.createElement(ProductsPanel)).includes('Crear producto'), allowed);
    const { NewProductForm } = load('src/pages/marketplace/NewProductForm.tsx', { ...deps(role), '../../api/marketplace': {} });
    assert.equal(renderToStaticMarkup(React.createElement(NewProductForm, { onCreated() {}, onCancel() {} })).includes('<form'), allowed);
    const { ProductDetail } = load('src/pages/marketplace/ProductDetail.tsx', { ...deps(role),
      '../../api/marketplace': {}, '../../lib/marketMeta': { MARKET_STATUS_META: { draft: { label: 'Borrador' } } } });
    const html = renderToStaticMarkup(React.createElement(ProductDetail, { product, onChanged() {} }));
    for (const action of ['Guardar cambios', 'Archivar', '<input', '<form']) {
      assert.equal(html.includes(action), allowed, `${role}: producto ${action}`);
    }
    assert.ok(html.includes('Producto visible') && html.includes('Proveedor visible'));
    assert.ok(html.includes('https://example.org/producto'));
    if (!allowed) assert.ok(!html.includes('Sin datos'), 'precio cero se conserva');
    const { CaregiverDetail } = load('src/pages/marketplace/CaregiverDetail.tsx', { ...deps(role),
      '../../api/caregivers': {}, '../../lib/caregiverMeta': { CAREGIVER_STATUS_META: { pending: { label: 'Pendiente' } } } });
    const person = renderToStaticMarkup(React.createElement(CaregiverDetail, { caregiver, onChanged() {} }));
    assert.equal(person.includes('>Aprobar</button>'), allowed);
    assert.equal(person.includes('>Suspender</button>'), allowed);
    assert.ok(person.includes('Cuidadora visible') && person.includes('Acompañamiento'));
  }
});

test('el selector de responsables usa el endpoint mínimo de soporte', async () => {
  const calls = [];
  const { fetchAgents } = load('src/api/tickets.ts', { './client': { apiFetch: async path => {
    calls.push(path); return new Response(JSON.stringify([{ id: 'agent', full_name: 'Responsable' }]));
  } } });
  assert.equal((await fetchAgents())[0].full_name, 'Responsable');
  assert.deepEqual(calls, ['/support/agents']);
});
