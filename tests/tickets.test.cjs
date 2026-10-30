const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
class FormValues { constructor(values) { this.values = values; } get(name) { return this.values[name]; } }
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, URLSearchParams, FormData: FormValues, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const meta = load('src/lib/ticketMeta.ts', { './colors': { CHART_COLORS: {} } });
const permissions = load('src/routes/permissions.ts');
const context = load('src/pages/tickets/TicketContext.tsx');
const deps = { './TicketContext': context, '../../lib/ticketMeta': meta, '../../lib/format': { fmt: String, ticketDate: String },
  '../../lib/roleMeta': { roleLabel: String }, '../../routes/permissions': permissions,
  '../../auth/AuthContext': { useAuth: () => ({ user: { role: 'support' } }) } };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function mount(path, name, dependencies, props = {}) {
  const states = [], effects = [], previous = [], cleanups = [];
  let si = 0, ei = 0;
  const hooks = { ...React,
    useState(initial) { const i = si++; if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, values) { const i = ei++; if (!previous[i] || values.some((value, j) => value !== previous[i][j])) {
      previous[i] = values; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
    } },
  };
  const component = load(path, { ...deps, ...dependencies, react: hooks })[name];
  const tree = () => { si = 0; ei = 0; return component(props); };
  return { tree, html: () => renderToStaticMarkup(tree()),
    async settle() { tree(); effects.splice(0).forEach(fn => fn()); await new Promise(setImmediate); },
    find: predicate => find(tree(), predicate),
  };
}

test('tickets transmite filtros combinados, paginación, # escapado y PATCH sin desasignación implícita', async () => {
  const calls = [];
  const api = load('src/api/tickets.ts', { './client': { apiFetch: async (path, options) => {
    calls.push({ path, body: options?.body && JSON.parse(options.body) }); return new Response('{}');
  } } });
  await api.fetchTickets({ page: 2, pageSize: 25, search: '#123', status: 'open', priority: 'high', category: 'other', role: 'elder', assignedTo: 'agent', order: '-priority' });
  const query = new URLSearchParams(calls[0].path.split('?')[1]);
  assert.equal(query.get('q'), '#123'); assert.equal(query.get('assigned_to'), 'agent');
  for (const key of ['page', 'page_size', 'status', 'priority', 'category', 'role', 'order']) assert.ok(query.has(key));
  await api.fetchTicketDetail('#123'); assert.equal(calls[1].path, '/support/tickets/%23123');
  await api.fetchTicketReplies('uuid', 3); assert.match(calls[2].path, /page=3&page_size=25$/);
  await api.updateTicket('uuid', { priority: 'high' }); assert.deepEqual(calls[3].body, { priority: 'high' });
  await api.updateTicket('uuid', { assigned_to: null }); assert.deepEqual(calls[4].body, { assigned_to: null });
});

test('crear no confirma enlace automáticamente y errores de conversación no se ocultan como vacíos', async () => {
  const calls = [];
  const api = load('src/api/tickets.ts', { './client': { apiFetch: async (path, options) => {
    calls.push(options?.body && JSON.parse(options.body));
    return new Response(JSON.stringify({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } }), { status: 404 });
  } } });
  await assert.rejects(api.createTicket({ subject: 'Ayuda' }), error => error.code === 'USER_NOT_FOUND');
  assert.equal(calls[0].confirm_unlinked, false);
  await assert.rejects(api.fetchTicketReplies('uuid'), /Usuario no encontrado/);
});

test('formulario exige confirmar expresamente el mismo ticket sin enlace', async () => {
  class TicketApiError extends Error { constructor() { super('Sin enlace'); this.code = 'USER_NOT_FOUND'; } }
  const calls = []; let created = 0;
  const form = mount('src/pages/tickets/NewTicketForm.tsx', 'NewTicketForm', { '../../api/tickets': {
    TicketApiError, createTicket: async payload => { calls.push(payload); if (!payload.confirm_unlinked) throw new TicketApiError(); },
  } }, { onCreated() { created++; }, onCancel() {} });
  const values = { subject: 'Solicitud', user_email: 'persona@example.org', description: 'Mi descripción', category: 'other', priority: 'high', channel: 'phone' };
  form.find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: values });
  await new Promise(setImmediate);
  assert.match(form.html(), /crear el ticket sin enlace/); assert.equal(created, 0); assert.equal(calls.length, 1);
  form.find(node => node.type === 'button' && node.props.children === 'Confirmar creación sin enlace').props.onClick();
  await new Promise(setImmediate);
  assert.equal(calls.length, 2); assert.equal(calls[1].confirm_unlinked, true);
  assert.equal(calls[1].user_email, values.user_email); assert.equal(calls[1].channel, 'phone'); assert.equal(created, 1);
});

const ticket = { id: 'uuid', number: 100, subject: 'Prueba', description: 'Descripción', category: 'other', priority: 'medium', status: 'open',
  requester: { name: 'Persona', email: 'persona@example.org', role: null }, assigned_to: null,
  created_at: '2026-10-27', updated_at: '2026-10-27', first_response_at: null, replies_count: 26,
  requester_context: { dispositivo: 'Teléfono' }, csat: { score: 4, comment: 'Gracias' } };

test('detalle pagina conversación, muestra contexto/CSAT y manda solo campos modificados', async () => {
  const pages = [], patches = [];
  const detail = mount('src/pages/tickets/TicketDetail.tsx', 'TicketDetail', { '../../api/tickets': {
    fetchTicketDetail: async () => ticket, fetchAgents: async () => [],
    fetchTicketReplies: async (_id, page) => { pages.push(page); return { items: [{ id: `r${page}`, author_name: 'Agente', body: `Mensaje ${page}`, internal: page === 1 }], page, page_size: 25, total: 26 }; },
    updateTicket: async (_id, patch) => patches.push(patch),
  } }, { ticketId: 'uuid', onTicketUpdated() {} });
  await detail.settle();
  assert.match(detail.html(), /Teléfono/); assert.match(detail.html(), /4\/5 · Gracias/);
  assert.match(detail.html(), /Nota interna · solo personal autorizado/);
  const statusOptions = detail.find(node => node.type === 'select' && node.props.id === 'ticket-status-update').props.children;
  assert.deepEqual(Array.from(statusOptions, node => node.props.value), ['open', 'in_progress', 'resolved']);
  const priority = detail.find(node => node.type === 'select' && node.props.value === 'medium');
  priority.props.onChange({ target: { value: 'critical' } });
  await detail.find(node => node.type === 'button' && node.props.children === 'Guardar cambios').props.onClick();
  await new Promise(setImmediate);
  assert.equal(JSON.stringify(patches[0]), JSON.stringify({ priority: 'critical' }));
  await detail.settle();
  detail.find(node => node.type === 'button' && node.props.children === 'Mensajes siguientes').props.onClick();
  await detail.settle();
  assert.equal(pages.at(-1), 2); assert.match(detail.html(), /Mensaje 2/); assert.match(detail.html(), /Respuesta pública/);
});

test('ticket cerrado conserva lectura y oculta el formulario de mensajes', async () => {
  const detail = mount('src/pages/tickets/TicketDetail.tsx', 'TicketDetail', { '../../api/tickets': {
    fetchTicketDetail: async () => ({ ...ticket, status: 'closed' }), fetchAgents: async () => [],
    fetchTicketReplies: async () => ({ items: [], page: 1, page_size: 25, total: 0 }),
  } }, { ticketId: 'uuid', onTicketUpdated() {} });
  await detail.settle();
  assert.match(detail.html(), /cerrado y no admite/); assert.doesNotMatch(detail.html(), /<textarea/);
});

test('contexto conserva información anidada y escapa texto del solicitante', () => {
  const html = renderToStaticMarkup(React.createElement(context.TicketContext, { value: {
    patients: [{ display_name: '<script>Paciente</script>' }], devices: [{ platform: 'android', app_version: '1.0.3' }], cantidad: 0,
  } }));
  assert.match(html, /Personas a su cuidado/); assert.match(html, /Versión de la aplicación/);
  assert.match(html, /1.0.3/); assert.match(html, />0</); assert.doesNotMatch(html, /<script>/);
});

test('listado combina filtros, reinicia página y descarta una respuesta anterior', async () => {
  const requests = [];
  const page = mount('src/pages/tickets/TicketsPage.tsx', 'TicketsPage', {
    '../../api/tickets': { fetchAgents: async () => [], fetchTickets: params => new Promise(resolve => requests.push({ params, resolve })) },
    './NewTicketForm': { NewTicketForm: () => null }, './TicketDetail': { TicketDetail: () => null }, './TicketsTable': { TicketsTable: () => null },
  });
  await page.settle();
  const change = (label, value) => page.find(node => node.props?.['aria-label'] === label).props.onChange({ target: { value } });
  change('Filtrar por prioridad', 'critical'); change('Filtrar por categoría', 'other');
  await page.settle();
  assert.equal(requests.at(-1).params.priority, 'critical'); assert.equal(requests.at(-1).params.category, 'other'); assert.equal(requests.at(-1).params.page, 1);
  const result = { items: [], total: 60, page: 1, page_size: 25 };
  requests.at(-1).resolve(result); await new Promise(setImmediate);
  requests[0].resolve({ ...result, total: 999 }); await new Promise(setImmediate);
  assert.doesNotMatch(page.html(), /999 tickets/);
  page.find(node => node.type === 'button' && node.props.children === 'Siguiente').props.onClick();
  await page.settle(); assert.equal(requests.at(-1).params.page, 2);
  change('Filtrar por estado', 'resolved'); await page.settle();
  assert.equal(requests.at(-1).params.page, 1); assert.equal(requests.at(-1).params.priority, 'critical');
});
