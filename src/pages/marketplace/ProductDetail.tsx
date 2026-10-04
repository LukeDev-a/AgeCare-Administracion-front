import { useEffect, useState, type FormEvent } from 'react';
import { archiveProduct, updateProduct, type Product } from '../../api/marketplace';
import { MARKET_STATUS_META } from '../../lib/marketMeta';

interface ProductDetailProps {
  product: Product;
  onChanged: () => void;
}

export function ProductDetail({ product, onChanged }: ProductDetailProps) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [vendor, setVendor] = useState(product.vendor);
  const [priceClp, setPriceClp] = useState(product.price_clp != null ? String(product.price_clp) : '');
  const [externalUrl, setExternalUrl] = useState(product.external_url);
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    setName(product.name);
    setCategory(product.category);
    setVendor(product.vendor);
    setPriceClp(product.price_clp != null ? String(product.price_clp) : '');
    setExternalUrl(product.external_url);
    setImageUrl(product.image_url ?? '');
  }, [product]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await updateProduct(product.id, {
        name,
        category,
        vendor,
        external_url: externalUrl,
        ...(priceClp.trim() ? { price_clp: Number(priceClp) } : {}),
        ...(imageUrl.trim() ? { image_url: imageUrl } : {}),
      });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    setIsArchiving(true);
    try {
      await archiveProduct(product.id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible archivar el producto.');
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
      <form className="ticket-form" onSubmit={event => void handleSave(event)}>
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
          Precio CLP
          <input value={priceClp} onChange={event => setPriceClp(event.target.value)} type="number" min={0} />
        </label>
        <label className="wide">
          Enlace externo HTTPS
          <input value={externalUrl} onChange={event => setExternalUrl(event.target.value)} type="url" required />
        </label>
        <label className="wide">
          Imagen HTTPS
          <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} type="url" />
        </label>
        <div className="ticket-form-actions">
          <button className="action-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            className="action-button"
            type="button"
            disabled={isArchiving || product.status === 'archived'}
            onClick={() => void handleArchive()}
          >
            {isArchiving ? 'Archivando...' : 'Archivar'}
          </button>
        </div>
      </form>
    </div>
  );
}