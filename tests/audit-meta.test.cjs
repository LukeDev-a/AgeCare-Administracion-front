const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sourcePath = "src/lib/auditMeta.ts";
const scope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, scope);
const api = scope.exports;
test('presenta acciones y registros de negocio sin usar rutas HTTP', () => {
 const entry = { action: 'games.delete', action_label: 'Eliminó un juego o aplicación', module_label: 'Juegos y aplicaciones', entity_name: 'Memoria', entity_id: 'id', before: null, after: null, metadata: { path: '/api/v1/admin/games-apps/' } };
 assert.equal(api.auditAction(entry), 'Eliminó un juego o aplicación');
 assert.equal(api.auditModule(entry), 'Juegos y aplicaciones');
 assert.equal(api.auditRecord(entry), 'Memoria');
 assert.equal(api.auditRecord({ ...entry, entity_name: '', before: { title: 'Juego eliminado' } }), 'Juego eliminado');
 assert.ok(api.AUDIT_ACTION_OPTIONS.some(([key, label]) => key === 'games.activate' && label.startsWith('Activó')));
 assert.ok(api.AUDIT_ACTION_OPTIONS.some(([key]) => key === 'auth.login'));
 assert.ok(api.AUDIT_ACTION_OPTIONS.some(([key]) => key === 'ticket.conversation_read'));
 assert.ok(api.AUDIT_ACTION_OPTIONS.every(([key]) => !key.startsWith('ui.') && !key.startsWith('http.')));
});
test('distingue consultas de listados, elementos sin título y acciones sin elemento individual', () => {
 const base = { action: 'end_users.demo_list', entity_name: '', entity_type: 'demo_app_account', entity_id: null, before: null, after: null };
 assert.equal(api.auditRecord(base), 'Listado de cuentas de la aplicación');
 assert.equal(api.auditRecord({ ...base, action: 'patients.demo_list' }), 'Listado de adultos mayores');
 assert.equal(api.auditRecord({ ...base, action: 'payments.read' }), 'Suscripciones y cobros');
 assert.equal(api.auditRecord({ ...base, action: 'end_users.demo_read', entity_id: 'uuid' }), 'Cuenta de la aplicación');
 assert.equal(api.auditRecord({ ...base, action: 'ticket.conversation_read', entity_type: 'ticket', entity_id: 'uuid' }), 'Conversación de soporte');
 assert.equal(api.auditRecord({ ...base, action: 'staff.update', entity_type: 'admin_user', entity_id: 'uuid', after: { full_name: 'Ana Pérez' } }), 'Ana Pérez');
 assert.equal(api.auditRecord({ ...base, action: 'payments.refund', entity_type: 'payment_charges', entity_id: 'uuid' }), 'Cobro');
 assert.equal(api.auditRecord({ ...base, action: 'unknown', entity_type: null }), 'Sin elemento individual asociado');
 assert.equal(api.auditRecord({ ...base, action: 'unknown', entity_type: null, entity_id: 'uuid' }), 'Elemento identificado por su ID');
});

test('la vista conserva el acceso al detalle y no presenta metadatos HTTP', () => {
 for (const path of ["src/pages/auditoria/AuditTable.tsx","src/pages/auditoria/AuditDetail.tsx"]) {
  const source = fs.readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /metadata\.(path|method|status_code|control)|useConsoleAudit|data-audit-/);
 }
 assert.match(fs.readFileSync("src/pages/auditoria/AuditTable.tsx", 'utf8'), /onClick=\{\(\) => (onSelect|setSelected)\(entry\)\}/);
});

