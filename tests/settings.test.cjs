const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const scope = { exports: {}, URLSearchParams, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports;
}

test('consulta todas las claves y una clave exacta mediante cliente autenticado', async () => {
  const calls = [];
  const api = load('src/api/settings.ts', { './client': { apiFetch: async (...args) => {
    calls.push(args); return new Response(JSON.stringify({ settings: [] }));
  } } });
  await api.fetchSettings();
  await api.fetchSettings('clave & espacios');
  assert.equal(calls[0][0], '/settings');
  assert.equal(new URL(calls[1][0], 'http://local').searchParams.get('key'), 'clave & espacios');
});

test('guarda valor, versión y motivo y conserva detalles/código de conflicto', async () => {
  const input = { value: { active: false }, version: 3, change_note: 'Cambio solicitado' };
  const api = load('src/api/settings.ts', { './client': { apiFetch: async (path, options) => {
    assert.equal(path, '/settings/clave%2Fsegura');
    assert.equal(options.method, 'PUT');
    assert.deepEqual(JSON.parse(options.body), input);
    return new Response(JSON.stringify({ error: { code: 'VERSION_CONFLICT', message: 'Recarga', details: [] } }), { status: 409 });
  } } });
  await assert.rejects(api.updateSetting('clave/segura', input), error => error instanceof api.SettingsError && error.code === 'VERSION_CONFLICT');
});

test('editor de campos mantiene cero, falso y límites de validación', () => {
  const meta = load('src/lib/settingsMeta.ts');
  const { SettingValueFields } = load('src/pages/configuracion/SettingValueFields.tsx', { '../../lib/settingsMeta': meta });
  const html = renderToStaticMarkup(React.createElement(SettingValueFields, { value: { gold: 0, enabled: false },
    schema: { type: 'object', properties: { gold: { type: 'integer', minimum: 0, maximum: 100 }, enabled: { type: 'boolean' } } },
    disabled: false, onChange: () => {},
  }));
  assert.ok(html.includes('value="0"') && html.includes('min="0"') && html.includes('max="100"'));
  assert.match(html, /value="false" selected=""/);
});

test('un conflicto conserva el borrador y nunca reintenta con una versión nueva automáticamente', async () => {
  const api = load('src/api/settings.ts', { './client': { apiFetch: () => {} } });
  const meta = load('src/lib/settingsMeta.ts');
  const states = [];
  let cursor = 0;
  const calls = [];
  function Fields() {}
  const { SettingEditor } = load('src/pages/configuracion/SettingEditor.tsx', {
    react: { useState: initial => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    } },
    '../../lib/settingsMeta': meta,
    './SettingValueFields': { SettingValueFields: Fields },
    '../../api/settings': { ...api, updateSetting: async (key, input) => {
      calls.push({ key, input }); throw new api.SettingsError('Modificado por otro admin', 'VERSION_CONFLICT');
    } },
  });
  const setting = { key: 'plan_prices', description: 'Precios', value: { gold: 1 },
    schema: { type: 'object', properties: { gold: { type: 'integer' } } }, version: 5, updated_at: null, updated_by: null };
  function render() { cursor = 0; return SettingEditor({ setting, onSaved: () => assert.fail('No debe guardarse en conflicto') }); }
  function nodes(element) {
    if (!element || typeof element !== 'object') return [];
    if (Array.isArray(element)) return element.flatMap(nodes);
    return [element, ...nodes(element.props?.children)];
  }
  let tree = nodes(render());
  tree.find(node => node.type === Fields).props.onChange({ gold: 9 });
  tree = nodes(render());
  tree.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Cambio operativo' } });
  tree = nodes(render());
  await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  tree = nodes(render());
  assert.equal(tree.find(node => node.type === Fields).props.value.gold, 9);
  assert.equal(tree.find(node => node.type === 'textarea').props.value, 'Cambio operativo');
  assert.equal(tree.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.version, 5);
});
