import { useState, type FormEvent } from 'react';
import { updateProduct, type Product, type ProductPatch, type ProductStatus } from '../../api/marketplace';
import { MARKET_STATUS_META } from '../../lib/marketMeta';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';

interface ProductDetailProps {
  product: Product;
  onChanged: () => void;
}

export function ProductDetail({ product, onChanged }: ProductDetailProps) {
  const { user } = useAuth();
  const canManage = canManageMarketplace(user?.role);
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [vendor, setVendor] = useState(product.vendor);
  const [priceClp, setPriceClp] = useState(product.price_clp != null ? String(product.price_clp) : '');
  const [externalUrl, setExternalUrl] = useState(product.external_url);
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const values = { name, category, vendor, external_url: externalUrl,
    price_clp: priceClp.trim() ? Number(priceClp) : null, image_url: imageUrl.trim() || null };
  const changes: ProductPatch = {};
  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    if (values[key] !== (product[key] ?? null)) Object.assign(changes, { [key]: values[key] });
  }
  const dirty = Object.keys(changes).length > 0;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setIsSaving(true);
    try {
      if (dirty) await updateProduct(product.id, changes);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(target: ProductStatus) {
    if (!canManage || dirty) return;
    setIsArchiving(true);
    try {
      await updateProduct(product.id, { status: target });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    } finally {
      setIsArchiving(false);
    }
  }

  const status = MARKET_STATUS_META[product.status] ?? MARKET_STATUS_META.draft;

  return (
    <div className="card content-detail">
      <div className="card-head">
        <div>
          <div className="card-title">{product.name}</div>
          <div className="card-sub">{product.vendor} · {product.category}</div>
        </div>
        <span className={`chip ${status.className}`}>{status.label}</span>
      </div>
      <p className="mini-note">ID: {product.id} · Última modificación: {product.updated_at ? new Date(product.updated_at).toLocaleString('es-CL') : 'Sin datos'}</p>
      <p>Precio referencial: {product.price_clp == null ? 'Precio no informado' : `${product.price_clp.toLocaleString('es-CL')} CLP`}</p>
      <a href={product.external_url} target="_blank" rel="noopener noreferrer">Ver artículo en el sitio del proveedor</a>
      <p className="mini-note">La compra se realiza en el sitio del proveedor. AgeCare muestra una vitrina informativa.</p>
      {product.image_url && <img src={product.image_url} alt={product.name} style={{ maxWidth: 240, maxHeight: 180, objectFit: 'contain' }} />}
      {canManage ? <form className="ticket-form" onSubmit={event => void handleSave(event)}>
        <label>
          Nombre
          <input value={name} onChange={event => setName(event.target.value)} minLength={3} maxLength={160} required />
        </label>
        <label>
          Categoría
          <input value={category} onChange={event => setCategory(event.target.value)} minLength={2} maxLength={60} required />
        </label>
        <label>
          Proveedor
          <input value={vendor} onChange={event => setVendor(event.target.value)} minLength={2} maxLength={120} required />
        </label>
        <label>
          Precio referencial CLP (opcional)
          <input value={priceClp} onChange={event => setPriceClp(event.target.value)} type="number" min={0} step={1} />
        </label>
        <label className="wide">
          Enlace externo HTTPS
          <input value={externalUrl} onChange={event => setExternalUrl(event.target.value)} type="url" required />
        </label>
        <label className="wide">
          Dirección de imagen (opcional)
          <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} type="url" />
        </label>
        <div className="ticket-form-actions">
          <button className="action-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {(product.status === 'draft' ? [['published', 'Publicar']] : product.status === 'published' ? [['draft', 'Volver a borrador'], ['archived', 'Archivar']] : [['draft', 'Restaurar a borrador']]).map(([target, label]) =>
            <button key={target} className="action-button" type="button" disabled={isSaving || isArchiving || dirty}
              onClick={() => void handleStatus(target as ProductStatus)}>{isArchiving ? 'Guardando...' : label}</button>)}
          {dirty && <p className="mini-note">Guarda los cambios antes de cambiar el estado.</p>}
        </div>
      </form> : <div className="ticket-detail-grid">
        {[
          ['Nombre', product.name], ['Categoría', product.category], ['Proveedor', product.vendor],
          ['Precio CLP', product.price_clp == null ? 'Precio no informado' : product.price_clp.toLocaleString('es-CL')],
          ['Enlace externo', product.external_url], ['Imagen', product.image_url || 'Sin imagen'],
        ].map(([label, value]) => <div key={label}>
          <div className="ticket-detail-label">{label}</div>
          <div className="ticket-detail-value" style={{ overflowWrap: 'anywhere' }}>{value}</div>
        </div>)}
      </div>}
    </div>
  );
}
