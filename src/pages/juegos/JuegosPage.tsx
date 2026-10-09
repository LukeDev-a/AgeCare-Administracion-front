import { useEffect, useState } from 'react';
import { deleteGameApp, fetchGamesApps, toggleGameAppStatus, type GameAppItem } from '../../api/gamesApps';
import { GameFormModal } from './GameFormModal';
import { GamesPreviewPanel } from './GamesPreviewPanel';
import { GamesTable } from './GamesTable';

export function JuegosPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [items, setItems] = useState<GameAppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [editingItem, setEditingItem] = useState<GameAppItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    fetchGamesApps(typeFilter)
      .then(data => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar el catálogo.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  async function handleToggle(item: GameAppItem) {
  try {
    await toggleGameAppStatus(item.id);
    refresh();
    } catch (err) {
    alert(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    }
  }

  async function handleDelete(item: GameAppItem) {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    try {
      await deleteGameApp(item.id);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible eliminar el elemento.');
    }
  }

  return (
    <>
      <div className="filter-row">
        <button className="action-button" type="button" onClick={() => setShowPreview(value => !value)}>
          {showPreview ? 'Modificar juegos' : 'Vista previa y rotación →'}
        </button>
      </div>

      {showPreview ? (
        <GamesPreviewPanel items={items} onChanged={refresh} />
      ) : (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Catálogo de juegos y aplicaciones</div>
              <div className="card-sub">Administra los módulos de estimulación cognitiva y bienestar ofrecidos en AgeCare.</div>
            </div>
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="all">Todos los tipos</option>
              <option value="game">Solo juegos</option>
              <option value="app">Solo apps</option>
            </select>
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
            >
              + Nuevo ítem
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {error && <div className="placeholder-box" style={{ padding: 30 }}>{error}</div>}
            {!error && isLoading && <div className="placeholder-box" style={{ padding: 30 }}>Cargando catálogo...</div>}
            {!error && !isLoading && (
              <GamesTable
                items={items}
                onToggle={item => void handleToggle(item)}
                onEdit={item => {
                  setEditingItem(item);
                  setShowModal(true);
                }}
                onDelete={item => void handleDelete(item)}
              />
            )}
          </div>
        </div>
      )}

      {showModal && (
        <GameFormModal
          editingItem={editingItem}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
