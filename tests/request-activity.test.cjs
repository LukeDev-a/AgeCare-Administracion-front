const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(fetch) {
  let clock = 0, timer;
  const scope = {
    exports: {}, fetch, Date: { now: () => clock },
    setTimeout: (callback, delay) => { timer = { callback, delay }; return 1; },
    clearTimeout: () => { timer = undefined; },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/requestActivity.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, scope);
  return { ...scope.exports, tick: value => { clock = value; }, timer: () => timer };
}

test('la carga cubre consultas simultáneas y conserva la visibilidad mínima sin retrasar respuestas', async () => {
  const resolve = [];
  const activity = setup(() => new Promise(done => resolve.push(done)));
  const changes = [];
  activity.subscribeRequestActivity(() => changes.push(activity.getRequestActivity()));
  const first = activity.activityFetch('/first');
  const second = activity.activityFetch('/second');
  assert.equal(activity.getRequestActivity(), true);
  resolve[0]('primera respuesta');
  assert.equal(await first, 'primera respuesta');
  assert.equal(activity.timer(), undefined);
  activity.tick(80);
  resolve[1]('segunda respuesta');
  assert.equal(await second, 'segunda respuesta');
  assert.equal(activity.timer().delay, 220);
  assert.equal(activity.getRequestActivity(), true);
  activity.timer().callback();
  assert.equal(activity.getRequestActivity(), false);
  assert.deepEqual(changes, [true, false]);
});

test('errores y cancelaciones liberan la carga y una nueva petición cancela el cierre pendiente', async () => {
  let finish;
  const activity = setup(async input => {
    if (input === '/failed') throw new Error('Petición cancelada');
    return new Promise(resolve => { finish = resolve; });
  });
  await assert.rejects(activity.activityFetch('/failed'), /Petición cancelada/);
  assert.equal(activity.timer().delay, 300);
  const request = activity.activityFetch('/retry');
  assert.equal(activity.timer(), undefined);
  assert.equal(activity.getRequestActivity(), true);
  activity.tick(500);
  finish('ok');
  assert.equal(await request, 'ok');
  assert.equal(activity.timer().delay, 0);
  activity.timer().callback();
  assert.equal(activity.getRequestActivity(), false);
});
