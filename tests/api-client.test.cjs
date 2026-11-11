const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const storage = new Map(), notifications = [];
  const transport = { send: async () => new Response('{}') };
  const globals = {
    Headers, AbortSignal, atob, Event, Date, setTimeout, clearTimeout,
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    window: { dispatchEvent: event => notifications.push(event.type) },
    fetch: (...args) => transport.send(...args),
  };
  const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const library = { ...globals, exports: {} };
  vm.runInNewContext(transpile(fs.readFileSync('src/lib/sessionClient.ts', 'utf8')), library);
  const activity = { ...globals, exports: {} };
  vm.runInNewContext(transpile(fs.readFileSync('src/lib/requestActivity.ts', 'utf8')), activity);
  const client = { ...globals, exports: {}, require: name => name === '../lib/requestActivity' ? activity.exports : library.exports };
  vm.runInNewContext(transpile(fs.readFileSync('src/api/client.ts', 'utf8').replace('import.meta.env.VITE_API_BASE_URL', "'http://api'")), client);
  return { api: client.exports, transport, notifications };
}

const token = seconds => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url')}.signature`;
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('todos los servicios usan el token renovado del cliente compartido', async () => {
  const { api, transport } = setup();
  api.setSession({ access_token: token(-5), refresh_token: 'old-refresh' });
  const fresh = token(900);
  transport.send = async (url, options) => {
    if (url.endsWith('/auth/refresh')) return response({ access_token: fresh, refresh_token: 'new-refresh' });
    assert.equal(options.headers.get('Authorization'), `Bearer ${fresh}`);
    return response({ ok: true });
  };
  assert.equal((await api.apiFetch('/audit-log')).status, 200);
  assert.equal(api.getRefreshToken(), 'new-refresh');
});

test('un refresh revocado notifica al contexto que debe cerrar la sesión', async () => {
  const { api, transport, notifications } = setup();
  api.setSession({ access_token: token(-5), refresh_token: 'revoked' });
  transport.send = async () => response({}, 401);
  assert.equal(await api.ensureFreshSession(), null);
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
  assert.deepEqual(notifications, ['agecare-session-expired']);
});
