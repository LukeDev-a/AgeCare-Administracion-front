const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function client() {
  const calls = [];
  const request = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ recovery_codes: [] })); };
  const scope = { exports: {}, fetch: request, require: () => ({ API_BASE_URL: 'http://api', apiFetch: request }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/accountAccess.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, scope);
  return { api: scope.exports, calls };
}
test('acepta invitaciones sin sesión y envía los secretos en el cuerpo, sin ponerlos en la URL', async () => {
  const { api, calls } = client();
  await api.inspectInvitation('private-token');
  await api.setupInvitation('private-token', true);
  await api.acceptInvitation('private-token', 'PrivatePassword', true, '123456');
  assert.equal(calls[2].url, 'http://api/auth/invitations/accept');
  assert.equal(calls[2].options.cache, 'no-store');
  assert.deepEqual(JSON.parse(calls[2].options.body), { token: 'private-token', password: 'PrivatePassword', enable_mfa: true, otp_code: '123456' });
  assert.ok(calls.every(call => !call.url.includes('private-token') && !call.url.includes('PrivatePassword')));
});
test('usa el cliente autenticado para reenviar, cancelar y consultar la política de cuentas', async () => {
  const { api, calls } = client();
  await api.resendInvitation('account'); await api.cancelInvitation('account'); await api.fetchStaffPolicy();
  assert.deepEqual(calls.map(call => call.url), ['/users/account/invitation/resend', '/users/account/invitation/cancel', '/users/policy']);
  assert.deepEqual(calls.map(call => call.options.method), ['POST', 'POST', 'GET']);
});
test('el alta de MFA utiliza un token limitado a la configuración', async () => {
  const { api, calls } = client();
  await api.setupEnrollment('limited-token'); await api.confirmEnrollment('limited-token', '654321');
  assert.equal(calls[0].url, 'http://api/auth/mfa/enrollment/setup');
  assert.deepEqual(JSON.parse(calls[1].options.body), { token: 'limited-token', otp_code: '654321' });
});
