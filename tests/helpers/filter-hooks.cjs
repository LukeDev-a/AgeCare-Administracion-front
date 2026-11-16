const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

// Usa el hook real con el mismo estado del componente en las pruebas sin DOM.
exports.filterDependency = (name, react = React) => {
  const file = name === '../../hooks/useAutoFilters' ? 'src/hooks/useAutoFilters.ts'
    : name === '../../lib/filterValidation' ? 'src/lib/filterValidation.ts' : null;
  if (!file) return undefined;
  const hooks = { ...react, useCallback(fn, dependencies) {
    const [memo] = react.useState(() => ({ fn, dependencies }));
    if (dependencies.some((value, i) => value !== memo.dependencies[i])) { memo.fn = fn; memo.dependencies = dependencies; }
    return memo.fn;
  }, useRef(initial) {
    const [ref] = react.useState(() => ({ current: initial })); return ref;
  } };
  const context = { exports: {}, setTimeout, clearTimeout, require: key => key === 'react' ? hooks : require(key) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
};
