import { useEffect, useState } from 'react';
import { fetchProducts, type ProductsListResponse } from '../../api/marketplace';
import { fmt } from '../../lib/format';
import { NewProductForm } from './NewProductForm';
import { ProductDetail } from './ProductDetail';
import { ProductsTable } from './ProductsTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';

export function ProductsPanel() {
  const { user } = useAuth();
  const canManage = canManageMarketplace(user?.role);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: ProductsListResponse | null; error: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = JSON.stringify([page, search, status, category, reloadToken]);
  const data = result?.key === queryKey ? result.data : null;
  const error = result?.key === queryKey ? result.error : '';
  const loading = result?.key !== queryKey;

  useEffect(() => {
    let cancelled = false;
    fetchProducts({ search, status, category, page })
      .then(response => {
        if (cancelled) return;
        setResult({ key: queryKey, data: response, error: '' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ key: queryKey, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar los productos.' });
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, category, page, reloadToken, queryKey]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setPage(1);
    setSearch(searchInput.trim());
    setCategory(categoryInput.trim());
  }

  const selectedProduct = data?.items.find(item => item.id === selectedId) ?? null;

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Catálogo de productos</div>
            <div className="card-sub">{data ? `${fmt(data.total)} productos · página ${data.page}` : 'Cargando productos...'}</div>
          </div>
          {canManage && <button className="action-button" type="button" onClick={() => setShowNewForm(value => !value)}>
            Crear producto
          </button>}
        </div>

        {canManage && showNewForm && (
          <NewProductForm
            onCancel={() => setShowNewForm(false)}
            onCreated={() => {
              setShowNewForm(false);
              setPage(1);
              refresh();
            }}
          />
        )}

        <div className="content-toolbar">
          <input
            type="search"
            placeholder="Buscar producto o proveedor"
            aria-label="Buscar productos"
            maxLength={120}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          />
          <input aria-label="Filtrar por categoría" placeholder="Categoría" value={categoryInput} maxLength={60}
            onChange={event => setCategoryInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSearch(); }} />
          <select aria-label="Filtrar productos" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
          <button className="action-button" type="button" onClick={refresh}>Actualizar lista</button>
        </div>
        <div className="pagination">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
          <span>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / data.page_size))}` : ''}</span>
          <button type="button" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {error && <table className="data"><tbody><tr><td>{error}</td></tr></tbody></table>}
          {!error && !data && <table className="data"><tbody><tr><td>Cargando productos...</td></tr></tbody></table>}
          {!error && data && (
            <ProductsTable items={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
      </div>

      {selectedProduct ? (
        <ProductDetail key={`${selectedProduct.id}:${selectedProduct.updated_at}`} product={selectedProduct} onChanged={refresh} />
      ) : (
        <div className="card content-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un producto para revisarlo.</div>
        </div>
      )}
    </>
  );
}
