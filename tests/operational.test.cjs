const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, Error, URLSearchParams, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}
const meta = load('src/lib/operationalMeta.ts');
const status = load('src/lib/statusMeta.ts');
const format = load('src/lib/format.ts');

test('consulta ventanas y varios componentes con cliente protegido y conserva error de API', async () => {
  const calls = [];
  const api = load('src/api/operational.ts', { './client': { apiFetch: async path => {
    calls.push(path);
    return path.includes('7d') ? new Response(JSON.stringify({ error: { message: 'Ventana rechazada' } }), { status: 422 })
      : new Response('{}');
  } } });
  await api.fetchOpsLatency();
  await api.fetchOpsLatency('24h', ['database', 'push']);
  assert.equal(calls[0], '/ops/latency?window=1h');
  const url = new URL(calls[1], 'http://local');
  assert.equal(url.searchParams.get('window'), '24h');
  assert.deepEqual(url.searchParams.getAll('components'), ['database', 'push']);
  await assert.rejects(api.fetchOpsLatency('7d'), /Ventana rechazada/);
});

test('tarjetas conservan p50 ausente, p95 conocido y cero real sin confundirlos', () => {
  const { OpsComponentCard } = load('src/pages/operativo/OpsComponentCard.tsx', {
    '../../lib/format': format, '../../lib/statusMeta': status, '../../lib/operationalMeta': meta,
  });
  const component = { key: 'push', name: 'Push', status: 'operational', uptime_30d: .99,
    latency_p50_ms: null, latency_p95_ms: 1900, checked_at: null, data_origin: 'demo', measurement_kind: 'delivery' };
  const html = renderToStaticMarkup(React.createElement(OpsComponentCard, { component }));
  assert.match(html, /p50: Sin datos/);
  assert.match(html, /p95: 1.900 ms/);
  assert.match(html, /Datos de demostración/);
  assert.match(html, /Entrega de notificaciones de extremo a extremo/);
  const zero = renderToStaticMarkup(React.createElement(OpsComponentCard, { component: { ...component, latency_p50_ms: 0 } }));
  assert.match(zero, /p50: 0 ms/);
});

test('procesos distinguen demostración de comprobación sintética y ejecución real', () => {
  assert.match(meta.opsExecution('synthetic'), /ejecución de prueba/);
  assert.match(meta.opsExecution('demo'), /demostración/);
  assert.match(meta.opsExecution('real'), /Ejecuciones reales/);
  assert.match(meta.opsExecution('unknown'), /sin verificar/);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

test('cambiar ventana consulta nuevos datos, ignora respuesta antigua y aísla fallo de incidentes', async () => {
  const states = [];
  let cursor = 0, effects = [], cancel = [], resolveOld;
  const calls = [];
  const api = {
    fetchOpsStatus: async () => ({ overall: null, checked_at: null, components: [] }),
    fetchOpsIncidents: async () => { throw new Error('Incidentes no disponibles'); },
    fetchCriticalProcesses: async () => ({ computed_at: null, processes: [{ key: 'ai', name: 'Consulta IA',
      chain: 'Prueba: app → IA', execution_kind: 'synthetic', data_origin: 'demo', p95_seconds: 4, success_24h: .9, status: 'degraded' }] }),
    fetchOpsLatency: (window, components) => {
      calls.push({ window, components });
      const data = { window, computed_at: null, missing_components: ['push'], components: [{ key: 'database', name: 'Base de datos',
        p50_ms: 6, p95_ms: 31, sample_count: 500, measurement_kind: 'service', data_origin: 'demo', computed_at: null }] };
      return window === '1h' ? new Promise(resolve => { resolveOld = () => resolve(data); }) : Promise.resolve(data);
    },
  };
  const blank = () => null;
  const { OperativoPage } = load('src/pages/operativo/OperativoPage.tsx', {
    react: {
      useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial;
        return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
      useCallback: callback => callback, useEffect: effect => effects.push(effect),
    }, '../../api/operational': api, '../../lib/format': format, '../../lib/statusMeta': status,
    '../../lib/operationalMeta': meta, './LatencyChart': { LatencyChart: blank }, './OpsComponentCard': { OpsComponentCard: blank },
    './IncidentsPanel': { IncidentsPanel: () => React.createElement('p', { role: 'alert' }, 'Incidentes no disponibles') },
  });
  function render() { cursor = 0; effects = []; return OperativoPage(); }
  function start() { cancel.forEach(cleanup => cleanup()); cancel = effects.map(effect => effect()); }
  let tree = render(); start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0].window, '1h');
  assert.equal(calls[0].components.length, 7);
  tree = render();
  find(tree, node => node.type === 'select').props.onChange({ target: { value: '7d' } });
  render(); start();
  await new Promise(resolve => setImmediate(resolve));
  resolveOld();
  await new Promise(resolve => setImmediate(resolve));
  const html = renderToStaticMarkup(render());
  assert.equal(calls[1].window, '7d');
  assert.match(html, /Ventana aplicada: 7 días/);
  assert.match(html, /500/);
  assert.match(html, /Sin datos de componentes/);
  assert.match(html, /Incidentes no disponibles/);
  assert.match(html, /Consulta IA/);
  assert.match(html, /Comprobación sintética: ejecución de prueba/);
  assert.match(html, /Sin datos: Notificaciones push/);
  assert.match(html, /31 ms/);
});
