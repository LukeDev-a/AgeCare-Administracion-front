const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(path, dependencies = {}, globals = {}) {
  const scope = { exports: {}, Error, require: name => dependencies[name] ?? require(name), ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}

test('aviso usa lectura autenticada sin caché HTTP', async () => {
  const calls = [];
  const api = load('src/api/runtimeSettings.ts', { './client': { apiFetch: async (...args) => {
    calls.push(args); return new Response(JSON.stringify({ enabled: false }));
  } } });
  assert.equal((await api.fetchSystemNotice()).enabled, false);
  assert.equal(calls[0][0], '/runtime/notice');
  assert.equal(calls[0][1].cache, 'no-store');
});

test('aviso se actualiza, escapa el texto y retira la copia al fallar la consulta', async () => {
  const state = [], effects = [], timers = [], listeners = new Map();
  let cursor = 0, failed = false, cleanup;
  const response = { enabled: true, title: '<script>no ejecutar</script>', body: 'Mensaje para la consola' };
  const { SystemNotice } = load('src/components/SystemNotice.tsx', {
    react: {
      useState: initial => { const id = cursor++; if (!(id in state)) state[id] = initial;
        return [state[id], value => { state[id] = value; }]; },
      useEffect: effect => effects.push(effect),
    },
    '../api/runtimeSettings': { fetchSystemNotice: async () => { if (failed) throw new Error('Red'); return response; } },
  }, { AbortController, window: {
    setInterval: (callback, ms) => { assert.equal(ms, 60_000); timers.push(callback); return 1; },
    clearInterval: id => assert.equal(id, 1), addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  } });
  function render() { cursor = 0; return renderToStaticMarkup(SystemNotice()); }
  assert.equal(render(), '');
  cleanup = effects.shift()();
  await new Promise(resolve => setImmediate(resolve));
  const html = render();
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  failed = true; timers[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(render(), /Se volverá a intentar automáticamente/);
  assert.doesNotMatch(render(), /Mensaje para la consola/);
  cleanup(); assert.equal(listeners.size, 0);
});

test('campos de configuración explican los efectos de funciones y avisos', () => {
  const meta = load('src/lib/settingsMeta.ts');
  assert.match(meta.fieldName('news_collection_enabled', {}), /recopilación de noticias/);
  assert.match(meta.settingDescription({ key: 'feature_flags' }), /trabajos ya aceptados continúan/);
  assert.match(meta.settingDescription({ key: 'system_texts' }), /No incluyas datos personales/);
});
