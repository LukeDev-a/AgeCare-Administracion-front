const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function client(send) {
  const scope = { exports: {}, URLSearchParams, require: () => ({ apiFetch: send }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/staff.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, scope);
  return scope.exports;
}
test('filtra cuentas con el cliente autenticado compartido', async () => {
  const api = client(async (path, options) => {
    const url = new URL(path, 'http://local');
    assert.equal(url.pathname, '/users');
    assert.equal(url.searchParams.get('q'), 'Nombre & correo');
    assert.equal(url.searchParams.get('role'), 'editor');
    assert.equal(url.searchParams.get('is_active'), 'false');
    assert.equal(url.searchParams.get('page'), '2');
    assert.ok(options.signal);
    return new Response(JSON.stringify({ items: [], total: 0 }));
  });
  assert.equal((await api.fetchStaff({ q: ' Nombre & correo ', role: 'editor', is_active: 'false' }, 2, new AbortController().signal)).total, 0);
});
test('crea, modifica y elimina sin leer JSON de una respuesta 204', async () => {
  const calls = [];
  const api = client(async (path, options) => {
    calls.push({ path, options });
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ id: 'id' }));
  });
  const input = { full_name: 'Cuenta', email: 'cuenta@wellq.co.uk', role: 'analyst', require_mfa: true };
  await api.createStaff(input);
  await api.updateStaff('id', { full_name: 'Editada', email: input.email, role: 'editor', is_active: false });
  await api.deleteStaff('id');
  assert.deepEqual(calls.map(c => [c.path, c.options.method]), [['/users', 'POST'], ['/users/id', 'PATCH'], ['/users/id', 'DELETE']]);
  assert.deepEqual(JSON.parse(calls[0].options.body), input);
});
test('presenta el error de protección de la cuenta propia', async () => {
  const api = client(async () => new Response(JSON.stringify({ error: { code: 'CANNOT_DELETE_SELF', message: 'No puedes eliminar tu propia cuenta.' } }), { status: 409 }));
  await assert.rejects(api.deleteStaff('self'), /No puedes eliminar tu propia cuenta/);
});
