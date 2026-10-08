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
const { ProfileDetails } = load('src/pages/perfil/ProfileDetails.tsx', {
  '../../lib/staffMeta': { STAFF_ROLES: { support: 'Soporte' } },
  'react-router-dom': { Link: ({ to, children }) => React.createElement('a', { href: to }, children) },
});
const profile = { id: 'cuenta-soporte', full_name: 'Persona de soporte', email: 'soporte@example.com',
  role: 'support', permissions: ['metrics', 'support'], last_login_at: '2026-10-07T14:00:00Z',
  mfa_enabled: true, mfa_required: true };

test('perfil muestra identidad, rol, fecha, permisos de consulta y enlace de seguridad', () => {
  const html = renderToStaticMarkup(React.createElement(ProfileDetails, { profile }));
  for (const text of ['cuenta-soporte', 'Persona de soporte', 'soporte@example.com', 'Soporte',
    'America/Santiago', '2026', 'Indicadores y estadísticas', 'Soporte y tickets', 'Obligatoria']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes('href="/seguridad"'));
  assert.ok(!html.includes('Cuentas de la consola'));
  assert.ok(!html.includes('<input'));
});

test('perfil distingue fecha ausente y ausencia de módulos asignados', () => {
  const html = renderToStaticMarkup(React.createElement(ProfileDetails, {
    profile: { ...profile, last_login_at: null, permissions: [] },
  }));
  assert.ok(html.includes('Sin inicios de sesión registrados'));
  assert.ok(html.includes('No tienes módulos de consulta asignados'));
});

test('consulta exclusivamente el perfil propio mediante cliente autenticado', async () => {
  const calls = [];
  const { fetchOwnProfile } = load('src/api/profile.ts', {
    './accountAccess': { accessRequest: async (...args) => { calls.push(args); return profile; } },
  });
  const signal = new AbortController().signal;
  assert.equal(await fetchOwnProfile(signal), profile);
  assert.equal(calls[0][0], '/auth/me');
  assert.equal(calls[0][1], undefined);
  assert.equal(calls[0][2], true);
  assert.equal(calls[0][3], signal);
});
