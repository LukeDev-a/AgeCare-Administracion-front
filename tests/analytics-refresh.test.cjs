const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}, globals = {}) {
  const scope = { exports: {}, Error, Date, AbortController, setTimeout, clearTimeout,
    require: key => dependencies[key], ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, scope);
  return scope.exports;
}
const { createAnalyticsPoller } = load('src/lib/analyticsRefresh.ts');
const settle = () => new Promise(setImmediate);
function environment() {
  let now = 0, visible = true, online = true, id = 0;
  const timers = new Map(), listeners = new Set();
  return {
    active: () => visible && online, now: () => now,
    later(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    cancel(timer) { timers.delete(timer); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    visibility(value) { visible = value; listeners.forEach(fn => fn()); },
    connection(value) { online = value; listeners.forEach(fn => fn()); },
    focus() { listeners.forEach(fn => fn()); },
    async advance(ms) {
      now += ms;
      for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); }
      await settle();
    }, timers, listeners,
  };
}

test('consulta al entrar y cada minuto, sin peticiones solapadas durante un arranque lento de Render', async () => {
  const env = environment(), calls = []; let finish;
  const poller = createAnalyticsPoller((background, signal) => {
    calls.push({ background, signal }); return new Promise(resolve => { finish = resolve; });
  }, env);
  assert.equal(calls.length, 1); assert.equal(calls[0].background, false);
  await env.advance(180000); env.focus(); assert.equal(calls.length, 1);
  finish(); await settle(); await env.advance(60000);
  assert.equal(calls.length, 2); assert.equal(calls[1].background, true);
  poller.stop(); assert.equal(calls[1].signal.aborted, true);
  finish(); await settle(); assert.equal(env.timers.size, 0); assert.equal(env.listeners.size, 0);
});

test('se pausa al ocultar o perder conexión y se pone al día al volver, incluso tras cambiar de día', async () => {
  const env = environment(), calls = [];
  const poller = createAnalyticsPoller(async background => { calls.push(background); }, env);
  await settle(); env.visibility(false); await env.advance(86400000);
  assert.equal(calls.length, 1); assert.equal(env.timers.size, 0);
  env.visibility(true); env.focus(); await settle(); assert.equal(calls.length, 2);
  env.connection(false); await env.advance(180000); assert.equal(calls.length, 2);
  env.connection(true); await settle(); assert.equal(calls.length, 3);
  poller.stop(); await env.advance(60000); assert.equal(calls.length, 3);
});

test('una pestaña ya oculta no despierta Render; desactivar durante edición pausa y reanudar vuelve a consultar', async () => {
  const env = environment(), calls = [];
  env.visibility(false);
  const poller = createAnalyticsPoller(async () => { calls.push(1); }, env);
  await env.advance(60000); assert.equal(calls.length, 0);
  env.visibility(true); await settle(); assert.equal(calls.length, 1);
  poller.setEnabled(false); await env.advance(60000); env.focus(); assert.equal(calls.length, 1);
  poller.setEnabled(true); await settle(); assert.equal(calls.length, 2);
  poller.stop();
});

test('un fallo se reintenta al minuto y detenerlo limpia todos los temporizadores', async () => {
  const env = environment(); let calls = 0;
  const poller = createAnalyticsPoller(async () => { calls++; throw new Error('fallo'); }, env);
  await settle(); await env.advance(60000); assert.equal(calls, 2);
  poller.stop(); await env.advance(60000); assert.equal(calls, 2);
});

test('el hook conserva cifras/fechas ante fallo de fondo y descarta respuestas de filtros anteriores', async () => {
  const env = environment(), state = [], effects = [], dependencies = [], cleanups = [];
  let cursor = 0, effectIndex = 0, calls = 0, rejectNext = false, oldFinish;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return state[index] ||= { current: initial }; },
    useEffect(fn, deps) { const index = effectIndex++;
      if (!dependencies[index] || deps.some((v, i) => v !== dependencies[index][i])) {
        dependencies[index] = deps; effects.push(() => { cleanups[index]?.(); cleanups[index] = fn(); });
      }
    },
  };
  const { useAnalyticsRemote } = load('src/hooks/useAnalyticsRemote.ts', {
    react, '../lib/analyticsRefresh': { createAnalyticsPoller: task => createAnalyticsPoller(task, env) },
  });
  const snapshot = { value: 15, computed_at: '2026-11-10' };
  const oldLoad = async options => {
    calls++; assert.equal(options.cache, 'no-store');
    if (rejectNext) throw new Error('Sin conexión');
    if (calls === 3) return new Promise(resolve => { oldFinish = resolve; });
    return snapshot;
  };
  function render(key = 'mes', loader = oldLoad, active = true) {
    cursor = effectIndex = 0; const result = useAnalyticsRemote(key, loader, active);
    effects.splice(0).forEach(fn => fn()); return result;
  }
  render(); await settle(); assert.equal(render().data.value, 15);
  rejectNext = true; await env.advance(60000);
  let result = render(); assert.equal(result.data, snapshot); assert.equal(result.data.computed_at, '2026-11-10');
  assert.match(result.error, /Sin conexión/);
  rejectNext = false; await env.advance(60000);
  const newLoad = async () => ({ value: 42, computed_at: '2026-11-17' });
  render('año', newLoad); await settle(); oldFinish({ value: 999 }); await settle();
  result = render('año', newLoad); assert.equal(result.data.value, 42); assert.equal(result.error, '');
  cleanups.forEach(fn => fn?.()); assert.equal(env.timers.size, 0);
});

test('los servicios propagan cancelación y modo de fondo sin cambiar filtros ni rutas', async () => {
  const calls = [], options = { background: true, signal: new AbortController().signal, cache: 'no-store' };
  const apiFetch = async (path, config) => { calls.push([path, config]); return { ok: true, json: async () => ({}) }; };
  const commercial = load('src/api/commercial.ts', { './client': { apiFetch } });
  const roles = load('src/api/usersSupport.ts', { './client': { apiFetch } });
  const operational = load('src/api/operational.ts', { './client': { apiFetch } }, { URLSearchParams });
  const features = load('src/api/features.ts', { './client': { apiFetch } });
  await commercial.fetchCommercialSummary('current_month', options);
  await commercial.fetchCommercialFunnel('2026-09', options);
  await commercial.fetchCommercialPlans(options);
  await roles.fetchRolesSummary(30, options); await roles.fetchRolesWeekly(8, options);
  await roles.fetchSupportSummary(options); await roles.fetchRecentTickets(options);
  await operational.fetchOpsStatus(options); await operational.fetchOpsLatency('1h', ['api'], options);
  await operational.fetchCriticalProcesses(options);
  await features.fetchFeatureAdoption(30, options); await features.fetchTopFeatures(30, 2, options);
  await features.fetchFeatureAlerts(30, .15, options);
  assert.equal(calls.length, 13); assert.ok(calls.every(([, config]) => config === options));
  assert.match(calls[1][0], /cohort_month=2026-09/); assert.match(calls[8][0], /window=1h&components=api/);
});
