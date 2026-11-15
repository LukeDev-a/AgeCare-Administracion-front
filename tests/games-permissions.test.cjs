const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(path, dependencies = {}) {
  const context = { exports: {}, require: name => dependencies[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const meta = load('src/lib/gamesMeta.ts');
const styles = load('src/pages/juegos/gameStyles.ts');
const modal = load('src/components/Modal.tsx');
const { GamesTable } = load('src/pages/juegos/GamesTable.tsx', { '../../lib/gamesMeta': meta, './gameStyles': styles });
const { GamesPreviewPanel } = load('src/pages/juegos/GamesPreviewPanel.tsx', { '../../api/gamesApps': {}, '../../lib/gamesMeta': meta, './gameStyles': styles });
const item = { id: 'test-game', title: 'Juego de prueba', slug: 'prueba', item_type: 'game',
  category: 'Memoria', min_tier: 'gratuito', is_active: true, featured: false,
  target_url: 'https://example.org/juego' };

test('solo admin/editor ven creación, edición, eliminación y cambio de estado en ambas vistas', () => {
  for (const role of ['admin', 'editor', 'analyst', 'support', 'moderator', undefined, 'desconocido']) {
    const canManage = meta.canManageGames(role);
    const expected = role === 'admin' || role === 'editor';
    assert.equal(canManage, expected);
    const table = renderToStaticMarkup(React.createElement(GamesTable, {
      items: [item], canManage, onEdit() {}, onDelete() {}, onToggle() {},
    }));
    assert.equal(table.includes('>Editar</button>'), expected, `${role}: editar`);
    assert.equal(table.includes('>Eliminar</button>'), expected, `${role}: eliminar`);
    assert.equal(table.includes('<th>Acciones</th>'), expected);
    assert.equal(table.includes('>Desactivar</button>'), expected, `${role}: cambio de estado`);
    assert.ok(table.includes('Juego de prueba'));
    const preview = renderToStaticMarkup(React.createElement(GamesPreviewPanel, {
      items: [item], canManage, onChanged() {},
    }));
    assert.equal(preview.includes('>Desactivar</button>'), expected, `${role}: acción de estado`);
    assert.ok(preview.includes('<iframe'), `${role}: consulta de vista previa`);
    const { JuegosPage } = load('src/pages/juegos/JuegosPage.tsx', {
      '../../api/gamesApps': {}, '../../auth/AuthContext': { useAuth: () => ({ user: role ? { role } : null }) },
      '../../lib/gamesMeta': meta, './GameFormModal': { GameFormModal: () => null },
      './GamesPreviewPanel': { GamesPreviewPanel }, './GamesTable': { GamesTable },
      './gameStyles': styles, '../../components/Modal': modal,
    });
    const page = renderToStaticMarkup(React.createElement(JuegosPage));
    assert.equal(page.includes('+ Crear juego o aplicación'), expected, `${role}: crear`);
    assert.ok(page.includes('Vista previa'));
  }
});

test('los estados vacíos para lectura no indican que el usuario puede modificar juegos', () => {
  const table = renderToStaticMarkup(React.createElement(GamesTable, { items: [], canManage: false }));
  assert.ok(table.includes('No hay resultados para esta consulta'));
  const preview = renderToStaticMarkup(React.createElement(GamesPreviewPanel, {
    items: [{ ...item, is_active: false }], canManage: false, onChanged() {},
  }));
  assert.ok(!preview.includes('Actívalo'));
  assert.ok(!preview.includes('Activa al menos'));
  assert.ok(!preview.includes('>Activar</button>'));
  assert.ok(!preview.includes('<iframe'));
});
