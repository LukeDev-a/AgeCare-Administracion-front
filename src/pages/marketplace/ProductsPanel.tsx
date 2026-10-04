import { useEffect, useState } from 'react';
import { fetchProducts, type ProductsListResponse } from '../../api/marketplace';
import { fmt } from '../../lib/format';
import { NewProductForm } from './NewProductForm';
import { ProductDetail } from './ProductDetail';
import { ProductsTable } from './ProductsTable';

export function ProductsPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<ProductsListResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchProducts({ search, status })
      .then(response => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar los productos.');
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, reloadToken]);

  function refresh() {
    setReloadToken(token => token + 1);
  }

  function handleSearch() {
    setSearch(searchInput.trim());
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
          <button className="action-button" type="button" onClick={() => setShowNewForm(value => !value)}>
            Crear producto
          </button>
        </div>

        {showNewForm && (
          <NewProductForm
            onCancel={() => setShowNewForm(false)}
            onCreated={() => {
              setShowNewForm(false);
              refresh();
            }}
          />
        )}

        <div className="content-toolbar">
          <input
            type="search"
            placeholder="Buscar producto o proveedor"
            aria-label="Buscar productos"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearch();
            }}
          />
          <select aria-label="Filtrar productos" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
          <button className="action-button" type="button" onClick={handleSearch}>Buscar</button>
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
        <ProductDetail product={selectedProduct} onChanged={refresh} />
      ) : (
        <div className="card content-detail">
          <div className="placeholder-box" style={{ padding: 35 }}>Selecciona un producto para revisarlo.</div>
        </div>
      )}
    </>
  );
}