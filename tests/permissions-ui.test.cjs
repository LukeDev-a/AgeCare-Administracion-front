const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let user, pathname;
function load(path, dependencies = {}) {
  const context = { exports: {}, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const permissions = load('src/routes/permissions.ts');
const dependencies = {
  '../auth/AuthContext': { useAuth: () => ({ user, isAuthenticated: true, isRestoring: false, logout: () => {} }) },
  '../routes/permissions': permissions,
  'react-router-dom': {
    useLocation: () => ({ pathname }),
    Navigate: ({ to }) => React.createElement('span', { 'data-redirect': to }),
    NavLink: ({ to, children }) => React.createElement('a', { href: to }, children),
  },
};
const { Sidebar } = load('src/layout/Sidebar.tsx', dependencies);
const { ProtectedRoute } = load('src/layout/ProtectedRoute.tsx', dependencies);
const roles = {
  admin: ['metrics', 'games', 'ops', 'support', 'content', 'marketplace', 'moderation', 'settings', 'legal', 'staff', 'audit'],
  analyst: ['metrics', 'games', 'ops', 'support'],
  support: ['metrics', 'games', 'ops', 'support'],
  editor: ['games', 'content', 'marketplace'],
  moderator: ['games', 'marketplace', 'moderation'],
};
test('el menú renderizado y el acceso directo a rutas respetan los cinco perfiles', () => {
  for (const [role, modules] of Object.entries(roles)) {
    user = { role, full_name: 'Cuenta de prueba', permissions: modules };
    const menu = renderToStaticMarkup(React.createElement(Sidebar));
    assert.equal(menu.includes('>Sistema</div>'), role === 'admin', `${role}: grupo Sistema`);
    assert.ok(menu.includes('aria-label="Mi cuenta"'), `${role}: navegación personal`);
    assert.ok(menu.indexOf('href="/perfil"') > menu.indexOf('class="sidebar-foot"'));
    assert.ok(menu.indexOf('href="/seguridad"') > menu.indexOf('class="sidebar-foot"'));
    assert.ok(menu.includes('href="/perfil"'), `${role}: perfil visible`);
    pathname = '/perfil';
    assert.equal(renderToStaticMarkup(React.createElement(ProtectedRoute, null, 'PERFIL PROPIO')), 'PERFIL PROPIO');
    for (const [path, module] of Object.entries(permissions.ROUTE_PERMISSIONS)) {
      const allowed = modules.includes(module);
      assert.equal(menu.includes(`href="${path}"`), allowed, `${role}: menú ${path}`);
      pathname = path;
      const route = renderToStaticMarkup(React.createElement(ProtectedRoute, null, 'CONTENIDO PROTEGIDO'));
      assert.equal(route.includes('CONTENIDO PROTEGIDO'), allowed, `${role}: ruta ${path}`);
      if (!allowed) assert.ok(route.includes('data-redirect='));
    }
    pathname = '/';
    assert.ok(renderToStaticMarkup(React.createElement(ProtectedRoute)).includes(
      `data-redirect="${permissions.firstAllowedRoute(modules)}"`));
  }
});

test('la vista inicial de códigos exige marcar guardado antes de Continuar', () => {
  const { RecoveryCodes } = load('src/components/RecoveryCodes.tsx');
  const markup = renderToStaticMarkup(React.createElement(RecoveryCodes, {
    codes: ['TESTCODE-ONLYTEST'], onDone: () => {},
  }));
  assert.ok(markup.includes('TESTCODE-ONLYTEST'));
  assert.match(markup, /type="checkbox"/);
  assert.match(markup, /disabled=""[^>]*>Continuar/);
});
