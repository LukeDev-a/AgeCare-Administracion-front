import { useEffect, useState } from 'react';
import { fetchProducts, type Product, type ProductsListResponse } from '../../api/marketplace';
import { fmt } from '../../lib/format';
import { NewProductForm } from './NewProductForm';
import { ProductDetail } from './ProductDetail';
import { ProductsTable } from './ProductsTable';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';
import { marketStyles as s } from './marketStyles';

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const queryKey = JSON.stringify([page, search, status, category, reloadToken]);
  const data = result?.key === queryKey ? result.data : null;
  const error = result?.key === queryKey ? result.error : '';
  const loading = result?.key !== queryKey;
  useEffect(() => {
    let cancelled = false;
    fetchProducts({ search, status, category, page })
      .then(response => { if (!cancelled) setResult({ key: queryKey, data: response, error: '' }); })
      .catch((err: unknown) => { if (!cancelled) setResult({ key: queryKey, data: null, error: err instanceof Error ? err.message : 'No fue posible cargar los productos.' }); });
    return () => { cancelled = true; };
  }, [search, status, category, page, reloadToken, queryKey]);
  function refresh() { setReloadToken(token => token + 1); }
  function handleSearch() { setPage(1); setSearch(searchInput.trim()); setCategory(categoryInput.trim()); }
  return <section className={s.panel} aria-label="Catálogo de productos">
    <div className="tw:mb-6 tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
      <div><h3 className={s.heading}>Productos</h3><p className={`tw:mt-2 ${s.muted}`}>Organiza la vitrina informativa. Las compras se realizan en el sitio del proveedor.</p></div>
      {canManage && <button className={`${s.button} ${s.primary}`} type="button" onClick={() => setShowNewForm(true)}>Crear producto</button>}
    </div>
    {notice && <p role="status" className={`tw:mb-5 ${s.notice}`}>{notice}</p>}
    <div className="tw:mb-6 tw:grid tw:items-end tw:gap-4 tw:md:grid-cols-2 tw:xl:grid-cols-[minmax(200px,1fr)_180px_170px_auto]">
      <label className={s.label}>Buscar producto o proveedor<input className={s.field} type="search" placeholder="Nombre o proveedor" aria-label="Buscar productos" maxLength={120} value={searchInput} onChange={event => setSearchInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSearch(); }} /></label>
      <label className={s.label}>Categoría<input className={s.field} aria-label="Filtrar por categoría" placeholder="Todas las categorías" value={categoryInput} maxLength={60} onChange={event => setCategoryInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSearch(); }} /></label>
      <label className={s.label}>Estado<select className={s.field} aria-label="Filtrar productos" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}><option value="">Todos los estados</option><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
      <button className={s.button} type="button" onClick={handleSearch}>Buscar</button>
    </div>
    <div className="tw:mb-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><p className={s.muted}>{data ? `${fmt(data.total)} productos · página ${data.page}` : error ? 'Consulta no disponible' : 'Consultando productos…'}</p><div className={s.actions}>
      {(searchInput || categoryInput || status) && <button className={s.button} type="button" onClick={() => { setSearchInput(''); setSearch(''); setCategoryInput(''); setCategory(''); setStatus(''); setPage(1); }}>Limpiar filtros</button>}
      <button className={s.button} type="button" disabled={loading} onClick={refresh}>Actualizar lista</button>
    </div></div>
    {error ? <p role="alert" className={s.error}>{error}</p> : !data ? <p role="status" className={`${s.notice} tw:py-10 tw:text-center`}>Cargando productos…</p> : <ProductsTable items={data.items} selectedId={selectedProduct?.id ?? null} onSelect={id => setSelectedProduct(data.items.find(item => item.id === id) ?? null)} />}
    <nav aria-label="Páginas de productos" className="tw:mt-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><button className={s.button} type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className={s.muted}>Página {page}{data ? ` de ${Math.max(1, Math.ceil(data.total / data.page_size))}` : ''}</span><button className={s.button} type="button" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></nav>
    {canManage && showNewForm && <NewProductForm onCancel={() => setShowNewForm(false)} onCreated={() => { setShowNewForm(false); setNotice('Producto creado como borrador. Puedes revisarlo antes de publicarlo.'); setPage(1); refresh(); }} />}
    {selectedProduct && <ProductDetail key={selectedProduct.id} product={selectedProduct} onClose={() => setSelectedProduct(null)} onChanged={refresh} />}
  </section>;
}
