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
test('la vista conserva el acceso al detalle y no presenta metadatos HTTP', () => {
 for (const path of ["src/pages/auditoria/AuditTable.tsx","src/pages/auditoria/AuditDetail.tsx"]) {
  const source = fs.readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /metadata\.(path|method|status_code|control)|useConsoleAudit|data-audit-/);
 }
 assert.match(fs.readFileSync("src/pages/auditoria/AuditTable.tsx", 'utf8'), /onClick=\{\(\) => (onSelect|setSelected)\(entry\)\}/);
});

