const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function modal(props) {
  let confirmation = false, effect, cleanup, closed = 0, opened = 0;
  const dialog = { showModal() { opened++; }, close() { closed++; } };
  const document = { body: { style: { overflow: 'auto' } } };
  const scope = { exports: {}, document, require: name => name === 'react' ? {
    useRef: () => ({ current: dialog }), useId: () => 'modal-title',
    useState: () => [confirmation, value => { confirmation = value; }],
    useEffect: fn => { effect = fn; },
  } : require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/Modal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, scope);
  const tree = () => scope.exports.Modal(props);
  return { tree, find: predicate => find(tree(), predicate), document,
    open() { tree(); cleanup = effect(); }, unmount() { cleanup(); }, opened: () => opened, closed: () => closed };
}

test('modal abre diálogo nativo, bloquea el fondo y solo cierra por acción explícita', () => {
  let closes = 0, prevented = 0;
  const h = modal({ title: 'Revisar contenido', children: 'Formulario', onClose() { closes++; } });
  h.open();
  assert.equal(h.opened(), 1);
  assert.equal(h.document.body.style.overflow, 'hidden');
  assert.equal(h.tree().props.onClick, undefined, 'pulsar el fondo no tiene manejador de cierre');
  h.tree().props.onCancel({ preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(closes, 0);
  h.find(n => n.type === 'button' && n.props.children === 'Cerrar').props.onClick();
  assert.equal(closes, 1);
  h.unmount();
  assert.equal(h.closed(), 1);
  assert.equal(h.document.body.style.overflow, 'auto');
});

test('modal conserva edición al cancelar descarte y exige confirmación para perder cambios', () => {
  let closes = 0;
  const h = modal({ title: 'Editar', dirty: true, children: 'Texto sin guardar', onClose() { closes++; } });
  h.find(n => n.type === 'button' && n.props.children === 'Cerrar').props.onClick();
  assert.equal(closes, 0);
  assert.ok(h.find(n => n.props?.role === 'alert'));
  h.find(n => n.type === 'button' && n.props.children === 'Volver a editar').props.onClick();
  assert.equal(h.find(n => n.props?.role === 'alert'), undefined);
  assert.equal(closes, 0);
  h.find(n => n.type === 'button' && n.props.children === 'Cerrar').props.onClick();
  h.find(n => n.type === 'button' && n.props.children === 'Descartar y cerrar').props.onClick();
  assert.equal(closes, 1);
});

test('modal impide salir mientras se procesa una acción', () => {
  let closes = 0;
  const h = modal({ title: 'Aprobar', busy: true, children: 'Solicitud pendiente', onClose() { closes++; } });
  const close = h.find(n => n.type === 'button' && n.props.children === 'Cerrar');
  assert.equal(close.props.disabled, true);
  close.props.onClick();
  assert.equal(closes, 0);
  assert.ok(h.find(n => n.props?.role === 'status'));
});

test('los errores se muestran en el encabezado del modal', () => {
  const h = modal({ title: 'Guardar contenido', error: 'La fecha debe ser futura', children: 'Formulario', onClose() {} });
  const header = h.find(n => n.type === 'header');
  assert.equal(find(header, n => n.props?.role === 'alert').props.children, 'La fecha debe ser futura');
});
