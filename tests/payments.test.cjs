const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, Date, Intl, Error, DOMException, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const model = load('src/pages/pagos/paymentData.ts');
const now = '2026-11-17T15:00:00.000Z';
const accounts = Array.from({ length: 12 }, (_, i) => ({ user_id: `account-${String(i).padStart(2, '0')}`, full_name: `Persona ${i}`, email: `persona${i}@example.test`, is_active: true, memberships_count: 0, data_origin: 'demo', deactivation_effect: 'demo_only' }));
const initial = () => model.initialPayments(accounts, now);
const action = { actor: 'Max', reason: 'Solicitud verificada' };

test('fixtures enlazan todos los cobros con una suscripción y conservan importes enteros', () => {
  const data = initial();
  assert.equal(data.subscriptions.length, 12);
  assert.equal(data.charges.length, 24);
  for (const c of data.charges) {
    const s = data.subscriptions.find(s => s.id === c.subscriptionId);
    assert.ok(s && s.name === c.name && s.plan === c.plan);
    assert.equal(c.userId, s.userId);
    const account = accounts.find(a => a.user_id === s.userId);
    assert.equal(s.email, account.email);
    assert.equal(s.name, account.full_name);
    assert.ok(Number.isInteger(c.amount) && c.amount > 0);
    assert.ok(c.at <= now && c.at >= s.startedAt);
  }
});

test('cancelar conserva cuenta, fecha y cobros; reduce MRR y rechaza una segunda cancelación', () => {
  const data = initial(), original = JSON.stringify(data);
  const s = data.subscriptions[0];
  const next = model.applyPaymentAction(data, { ...action, type: 'cancel', id: s.id }, now);
  assert.equal(JSON.stringify(data), original);
  assert.equal(next.subscriptions[0].state, 'cancelled');
  assert.equal(next.subscriptions[0].endsAt, s.endsAt);
  assert.equal(next.charges, data.charges);
  assert.equal(model.paymentSummary(next, now).mrr, model.paymentSummary(data, now).mrr - s.price);
  assert.equal(next.subscriptions[0].history[0].actor, 'Max');
  assert.throws(() => model.applyPaymentAction(next, { ...action, type: 'cancel', id: s.id }, now));
});

test('extender suma días desde fin del período, sin cobrar ni resolver mora', () => {
  const data = initial(), s = data.subscriptions.find(s => s.state === 'past_due');
  const next = model.applyPaymentAction(data, { ...action, type: 'extend', id: s.id, days: 7 }, now);
  const updated = next.subscriptions.find(v => v.id === s.id);
  assert.equal(updated.endsAt, model.plusDays(s.endsAt, 7));
  assert.equal(updated.state, 'past_due');
  assert.equal(next.charges, data.charges);
  for (const days of [0, 91, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => model.applyPaymentAction(data, { ...action, type: 'extend', id: s.id, days }, now));
  }
});

test('reembolso completo mantiene suscripción y rechaza cobros pendientes, rechazados o ya reembolsados', () => {
  const data = initial(), c = data.charges.find(c => c.state === 'approved');
  const next = model.applyPaymentAction(data, { ...action, type: 'refund', id: c.id }, now);
  assert.equal(next.subscriptions, data.subscriptions);
  assert.equal(next.charges.find(v => v.id === c.id).state, 'refunded');
  assert.equal(model.paymentSummary(next, now).net, model.paymentSummary(data, now).net - c.amount);
  const older = data.charges.find(c => c.state === 'approved' && c.at < model.plusDays(now, -30));
  const olderRefund = model.applyPaymentAction(data, { ...action, type: 'refund', id: older.id }, now);
  assert.equal(model.paymentSummary(olderRefund, now).net, model.paymentSummary(data, now).net - older.amount);
  assert.throws(() => model.applyPaymentAction(next, { ...action, type: 'refund', id: c.id }, now));
  for (const state of ['pending', 'failed', 'refunded']) {
    const charge = data.charges.find(c => c.state === state);
    assert.throws(() => model.applyPaymentAction(data, { ...action, type: 'refund', id: charge.id }, now));
  }
});

test('motivo obligatorio y registros inexistentes no alteran el conjunto', () => {
  const data = initial(), original = JSON.stringify(data);
  for (const reason of ['', '    ', 'hola', 'a'.repeat(501)]) {
    assert.throws(() => model.applyPaymentAction(data, { ...action, reason, type: 'cancel', id: data.subscriptions[0].id }, now));
  }
  assert.throws(() => model.applyPaymentAction(data, { ...action, type: 'refund', id: 'missing' }, now));
  assert.throws(() => model.applyPaymentAction(data, { ...action, type: 'extend', days: 5, id: 'missing' }, now));
  assert.equal(JSON.stringify(data), original);
});

test('renovaciones solo incluyen activas en siete días; aprobación sin cobros es nula', () => {
  const data = initial(), summary = model.paymentSummary(data, now);
  assert.equal(summary.renewals, 3);
  assert.equal(summary.pending, 2);
  assert.equal(summary.overdue, 2);
  assert.equal(model.paymentSummary({ subscriptions: [], charges: [] }, now).approval, null);
});

test('vista muestra ambas secciones, importes y filtros sin conectarse a una API de cobros', () => {
  let role = 'admin';
  const Modal = load('src/components/Modal.tsx');
  const styles = load('src/pages/pagos/paymentStyles.ts');
  const { PaymentsPage, PaymentsWorkspace } = load('src/pages/pagos/PaymentsPage.tsx', {
    '../../auth/AuthContext': { useAuth: () => ({ user: { id: 'staff-1', role, full_name: 'Max' } }) },
    '../../components/Modal': Modal, './paymentData': model, './paymentStyles': styles,
    '../../api/payments': { fetchPayments: () => { throw new Error('No debe consultar durante render'); }, savePaymentOperation() {} },
    '../../hooks/useAutoFilters': { useAutoFilters: () => ({ draft: { q: '', state: '', plan: '' }, filters: { q: '', state: '', plan: '' }, page: 1, setPage() {}, setField() {}, reset() {} }) },
  });
  assert.ok(renderToStaticMarkup(React.createElement(PaymentsPage)).includes('Cargando suscripciones y cobros'));
  const html = renderToStaticMarkup(React.createElement(PaymentsWorkspace, { initialData: initial() }));
  for (const text of ['Pagos y suscripciones', 'Suscripciones', 'Cobros', 'Restablecer filtros', 'Ver detalle', 'Renovación cancelada']) assert.ok(html.includes(text));
  for (role of ['support', 'editor', 'analyst', 'moderator']) {
    assert.ok(renderToStaticMarkup(React.createElement(PaymentsPage)).includes('No tienes permiso'));
  }
});

test('identidad por UUID evita homónimos y excluye renovación activa de cuentas inactivas', () => {
  const sameName = [{ ...accounts[0], full_name: 'Carmen Soto', email: 'carmen.uno@example.test' },
    { ...accounts[1], full_name: 'Carmen Soto', email: 'carmen.dos@example.test', is_active: false }];
  const data = model.initialPayments(sameName, now);
  assert.notEqual(data.subscriptions[0].userId, data.subscriptions[1].userId);
  assert.notEqual(data.subscriptions[0].email, data.subscriptions[1].email);
  assert.equal(data.subscriptions[1].state, 'cancelled');
  assert.equal(model.initialPayments([], now).subscriptions.length, 0);
  const reverse = model.initialPayments([...sameName].reverse(), now);
  assert.equal(JSON.stringify(data), JSON.stringify(reverse));
});

test('carga del directorio recorre páginas, conserva UUID y no sustituye errores por cuentas inventadas', async () => {
  const controller = new AbortController(), calls = [];
  const api = load('src/pages/pagos/paymentAccounts.ts', {
    '../../api/endUsers': { fetchEndUsers: async (q, state, page, signal) => {
      calls.push({ q, state, page, signal });
      return { items: page === 1 ? accounts.slice(0, 5) : accounts.slice(5), total: accounts.length };
    } },
  });
  const result = await api.fetchPaymentAccounts(controller.signal);
  assert.equal(result.length, accounts.length);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.q === '' && c.state === '' && c.signal === controller.signal));
  const failing = load('src/pages/pagos/paymentAccounts.ts', {
    '../../api/endUsers': { fetchEndUsers: async () => { throw new Error('API no disponible'); } },
  });
  await assert.rejects(failing.fetchPaymentAccounts(controller.signal), /API no disponible/);
  const repeated = load('src/pages/pagos/paymentAccounts.ts', {
    '../../api/endUsers': { fetchEndUsers: async () => ({ items: [accounts[0]], total: 2 }) },
  });
  await assert.rejects(repeated.fetchPaymentAccounts(controller.signal), /directorio cambió/);
  controller.abort();
  await assert.rejects(api.fetchPaymentAccounts(controller.signal), /cancelada/);
});

test('servicio consulta lo persistido, inicializa solo vacío y guarda versión, motivo y confirmación', async () => {
  const calls = [], data = { ...initial(), data_origin: 'demo' };
  let empty = false, fail = false;
  const api = load('src/api/payments.ts', {
    './client': { apiFetch: async (path, options) => {
      calls.push({ path, options });
      if (fail) return new Response(JSON.stringify({ error: { message: 'Versión desactualizada' } }), { status: 409 });
      return new Response(JSON.stringify(empty && options?.method !== 'POST'
        ? { data_origin: 'demo', subscriptions: [], charges: [] } : data));
    } },
  });
  const signal = new AbortController().signal;
  await api.fetchPayments(signal);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/payments');
  assert.equal(calls[0].options.signal, signal);
  empty = true;
  await api.fetchPayments(signal);
  assert.equal(calls.at(-1).path, '/payments/initialize');
  await api.savePaymentOperation({ ...action, type: 'extend', id: 'uuid', days: 7 }, 3);
  assert.equal(calls.at(-1).path, '/payments/subscriptions/uuid/operate');
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { action: 'extend', version: 3, reason: action.reason, confirmed: true, days: 7 });
  fail = true;
  await assert.rejects(api.savePaymentOperation({ ...action, type: 'refund', id: 'uuid' }, 1), /desactualizada/);
});
