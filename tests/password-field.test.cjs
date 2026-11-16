const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(react = React) {
  const scope = { exports: {}, require: name => name === 'react' ? react : require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/PasswordField.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  return scope.exports.PasswordField;
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function mount(props) {
  let shown = false;
  const Field = load({ useId: () => 'test-password', useState: () => [shown, value => { shown = value(shown); }] });
  return () => nodes(Field(props));
}

test('ojo muestra y oculta sin cambiar los atributos ni el valor y nunca envía el formulario', () => {
  const render = mount({ label: 'Contraseña actual', name: 'password', defaultValue: 'valor-ficticio', required: true, minLength: 8, maxLength: 128, autoComplete: 'current-password' });
  let tree = render();
  assert.equal(tree.find(n => n.type === 'input').props.type, 'password');
  const button = tree.find(n => n.type === 'button');
  assert.equal(button.props.type, 'button'); assert.equal(button.props['aria-pressed'], false);
  assert.match(button.props['aria-label'], /Mostrar contraseña/);
  button.props.onClick(); tree = render();
  const input = tree.find(n => n.type === 'input');
  assert.equal(input.props.type, 'text'); assert.equal(input.props.defaultValue, 'valor-ficticio');
  assert.equal(input.props.name, 'password'); assert.equal(input.props.autoComplete, 'current-password');
  assert.equal(input.props.required, true); assert.equal(input.props.minLength, 8); assert.equal(input.props.maxLength, 128);
  assert.equal(tree.find(n => n.type === 'button').props['aria-pressed'], true);
  tree.find(n => n.type === 'button').props.onClick();
  assert.equal(render().find(n => n.type === 'input').props.type, 'password');
});

test('cada contraseña tiene visibilidad independiente y los controles respetan disabled', () => {
  const first = mount({ label: 'Nueva contraseña', name: 'password' });
  const second = mount({ label: 'Repite la nueva contraseña', name: 'confirm', disabled: true });
  first().find(n => n.type === 'button').props.onClick();
  assert.equal(first().find(n => n.type === 'input').props.type, 'text');
  assert.equal(second().find(n => n.type === 'input').props.type, 'password');
  assert.equal(second().find(n => n.type === 'input').props.disabled, true);
  assert.equal(second().find(n => n.type === 'button').props.disabled, true);
});

test('etiquetas e identificadores únicos conectan cada ojo con su campo', () => {
  const Field = load();
  const html = renderToStaticMarkup(React.createElement('form', null,
    React.createElement(Field, { label: 'Nueva contraseña', name: 'password' }),
    React.createElement(Field, { label: 'Confirmación', name: 'confirm' })));
  const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2); assert.notEqual(ids[0], ids[1]);
  for (const id of ids) { assert.ok(html.includes(`for="${id}"`)); assert.ok(html.includes(`aria-controls="${id}"`)); }
});
