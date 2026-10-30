import { useEffect, useState } from 'react';
import { deleteGameApp, fetchGamesApps, toggleGameAppStatus, type GameAppItem } from '../../api/gamesApps';
import { GameFormModal } from './GameFormModal';
import { GamesPreviewPanel } from './GamesPreviewPanel';
import { GamesTable } from './GamesTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageGames } from '../../lib/gamesMeta';

export function JuegosPage() {
  const { user } = useAuth();
  const canManage = canManageGames(user?.role);
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ key: string; items: GameAppItem[]; error: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editingItem, setEditingItem] = useState<GameAppItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = `${typeFilter}:${stateFilter}:${reloadToken}`;
  const isLoading = result?.key !== queryKey;
  const error = result?.key === queryKey ? result.error : '';
  const items = result?.key === queryKey ? result.items.filter(item => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : [];

  useEffect(() => {
    let cancelled = false;
    fetchGamesApps(typeFilter, stateFilter)
      .then(data => {
        if (cancelled) return;
        setResult({ key: queryKey, items: data, error: '' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key: queryKey, items: [], error: err instanceof Error ? err.message : 'No fue posible cargar el catálogo.' });
      })
      ;
    return () => {
      cancelled = true;
    };
  }, [typeFilter, stateFilter, reloadToken, queryKey]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  async function handleToggle(item: GameAppItem) {
  if (!canManage) return;
  try {
    await toggleGameAppStatus(item.id);
    refresh();
    } catch (err) {
    alert(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    }
  }

  async function handleDelete(item: GameAppItem) {
    if (!canManage) return;
    if (!confirm(`¿Eliminar "${item.title}"? Se retirará del catálogo y dejará de estar disponible para jugar. Su historial de auditoría se conservará. Los otros juegos no se modificarán.`)) return;
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
        <input aria-label="Buscar juego por nombre" placeholder="Buscar por nombre" value={search} onChange={event => setSearch(event.target.value)} />
        <select aria-label="Filtrar juegos por estado" value={stateFilter} onChange={event => setStateFilter(event.target.value)}>
          <option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option>
        </select>
        <button className="action-button" type="button" onClick={() => setShowPreview(value => !value)}>
          {showPreview ? (canManage ? 'Modificar juegos' : 'Ver catálogo') : (canManage ? 'Vista previa y rotación →' : 'Vista previa →')}
        </button>
      </div>

      {showPreview ? (
        <GamesPreviewPanel items={items} canManage={canManage} onChanged={refresh} />
      ) : (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Catálogo de juegos y aplicaciones</div>
              <div className="card-sub">{canManage ? 'Administra' : 'Consulta'} los módulos de estimulación cognitiva y bienestar ofrecidos en AgeCare.</div>
            </div>
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="all">Todos los tipos</option>
              <option value="game">Solo juegos</option>
              <option value="app">Solo apps</option>
            </select>
            {canManage && <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingItem(null);
                setShowModal(true);
              }}
            >
              + Nuevo ítem
            </button>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            {error && <div className="placeholder-box" style={{ padding: 30 }}>{error}</div>}
            {!error && isLoading && <div className="placeholder-box" style={{ padding: 30 }}>Cargando catálogo...</div>}
            {!error && !isLoading && (
              <GamesTable
                canManage={canManage}
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

      {canManage && showModal && (
        <GameFormModal
          key={editingItem?.id ?? 'new'}
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
