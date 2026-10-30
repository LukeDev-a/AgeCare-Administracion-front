const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, URLSearchParams, Date, AbortController, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const meta = load('src/lib/auditMeta.ts');

test('filtros de auditoría envían entidad, actor eliminado y fechas UTC a listado y exportación', async () => {
  const calls = [];
  const api = load('src/api/audit.ts', { './client': { apiFetch: async path => {
    calls.push(path); return path.includes('/export') ? new Response('csv') : new Response(JSON.stringify({ items: [], total: 0 }));
  } } });
  const filters = { ...api.EMPTY_AUDIT_FILTERS, actor_id: 'deleted-actor', entity_type: 'ticket', entity_id: 'record-id',
    action: 'ticket.conversation_read', date_from: '2026-10-01T10:00', date_to: '2026-10-02T10:00' };
  assert.equal((await api.fetchAudit(filters, 2, 25)).total, 0);
  await api.exportAudit(filters);
  for (const path of calls) {
    const params = new URLSearchParams(path.split('?')[1]);
    assert.equal(params.get('actor_id'), 'deleted-actor');
    assert.equal(params.get('entity_type'), 'ticket'); assert.equal(params.get('entity_id'), 'record-id');
    assert.equal(params.get('date_from'), new Date(filters.date_from).toISOString());
    assert.equal(params.get('action'), 'ticket.conversation_read');
  }
});

test('detalle muestra identidad histórica, IP, navegador y causa sin rutas HTTP ni HTML ejecutable', () => {
  const { AuditDetail } = load('src/pages/auditoria/AuditDetail.tsx', { '../../lib/auditMeta': meta });
  const entry = { id: 'event', actor: { admin_id: 'deleted-actor', name: 'Cuenta eliminada', role: 'editor' },
    action: 'auth.login_failed', action_label: 'Intento de acceso rechazado', module_label: 'Acceso a la consola',
    entity_id: 'actor-id', before: null, after: { name: '<script>privado</script>' },
    ip: '127.0.0.1', user_agent: 'Navegador de prueba', created_at: '2026-10-27T15:00:00Z',
    metadata: { outcome: 'failure', reason: 'OTP_INVALID', path: '/api/private' } };
  const html = renderToStaticMarkup(React.createElement(AuditDetail, { entry, onClose() {} }));
  for (const value of ['Cuenta eliminada', 'deleted-actor', 'editor', '127.0.0.1', 'Navegador de prueba', 'Segundo factor incorrecto o expirado']) assert.ok(html.includes(value));
  assert.ok(!html.includes('/api/private') && !html.includes('<script>'));
});

test('la pantalla ofrece los filtros y explica el período predeterminado sin botones de modificación', () => {
  const { AuditoriaPage } = load('src/pages/auditoria/AuditoriaPage.tsx', {
    '../../api/audit': { EMPTY_AUDIT_FILTERS: { q: '', actor_id: '', action: '', entity_type: '', entity_id: '', date_from: '', date_to: '' } },
    '../../lib/auditMeta': meta, './AuditDetail': { AuditDetail: () => null }, './AuditTable': { AuditTable: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(AuditoriaPage));
  for (const value of ['Tipo de registro', 'Identificador del registro', 'cuentas eliminadas', 'últimos 30 días', 'hasta 90 días', 'Inició sesión', 'Consultó una conversación']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('>Eliminar<') && !html.includes('>Editar<'));
});
