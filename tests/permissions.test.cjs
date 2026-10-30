const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/routes/permissions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { canAccessRoute, firstAllowedRoute, ROUTE_PERMISSIONS } = context.exports;

test('cada rol solo accede a los módulos de su perfil y siempre a seguridad propia', () => {
  const roles = {
    admin: ['metrics', 'games', 'ops', 'support', 'content', 'marketplace', 'moderation', 'settings', 'legal', 'staff', 'audit', 'end_users'],
    analyst: ['metrics', 'games', 'ops', 'support'],
    support: ['metrics', 'games', 'ops', 'support'],
    editor: ['games', 'content', 'marketplace'],
    moderator: ['games', 'marketplace', 'moderation'],
  };
  for (const permissions of Object.values(roles)) {
    for (const [path, module] of Object.entries(ROUTE_PERMISSIONS)) {
      assert.equal(canAccessRoute(path, permissions), permissions.includes(module));
    }
    assert.equal(canAccessRoute('/seguridad', permissions), true);
    assert.equal(canAccessRoute(firstAllowedRoute(permissions), permissions), true);
  }
});

test('un perfil sin permisos no obtiene acceso implícito por rol ni por ruta desconocida', () => {
  assert.equal(canAccessRoute('/cuentas'), false);
  assert.equal(canAccessRoute('/desconocida', ['staff']), false);
  assert.equal(firstAllowedRoute(), '/seguridad');
});
