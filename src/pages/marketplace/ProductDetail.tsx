import { useState, type FormEvent } from 'react';
import { updateProduct, type Product, type ProductPatch, type ProductStatus } from '../../api/marketplace';
import { MARKET_STATUS_META } from '../../lib/marketMeta';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';
import { Modal } from '../../components/Modal';
import { marketStyles as s, statusColor } from './marketStyles';
interface ProductDetailProps { product: Product; onChanged: () => void; onClose?: () => void; }
function fields(product: Product) { return { name: product.name, category: product.category, vendor: product.vendor, price_clp: product.price_clp != null ? String(product.price_clp) : '', external_url: product.external_url, image_url: product.image_url ?? '' }; }
export function ProductDetail({ product, onChanged, onClose = () => {} }: ProductDetailProps) {
  const { user } = useAuth();
  const canManage = canManageMarketplace(user?.role);
  const [saved, setSaved] = useState(product);
  const [form, setForm] = useState(fields(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const values = { ...form, price_clp: form.price_clp.trim() ? Number(form.price_clp) : null, image_url: form.image_url.trim() || null };
  const changes: ProductPatch = {};
  for (const key of Object.keys(values) as (keyof typeof values)[]) if (values[key] !== (saved[key] ?? null)) Object.assign(changes, { [key]: values[key] });
  const dirty = Object.keys(changes).length > 0;
  async function persist(patch: ProductPatch) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await updateProduct(saved.id, patch);
      const confirmed = response && typeof response === 'object' && response.id ? response : { ...saved, ...patch } as Product;
      setSaved(confirmed); setForm(fields(confirmed)); setConfirmArchive(false);
      setNotice(patch.status ? 'Estado actualizado correctamente.' : 'Cambios guardados correctamente.');
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible guardar el producto.'); }
    finally { setBusy(false); }
  }
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canManage || busy || !dirty) return;
    await persist(changes);
  }
  async function handleStatus(target: ProductStatus) { if (!canManage || busy || dirty) return; await persist({ status: target }); }
  const transitions: [ProductStatus, string][] = saved.status === 'draft' ? [['published', 'Publicar']] : saved.status === 'published' ? [['draft', 'Volver a borrador'], ['archived', 'Archivar']] : [['draft', 'Restaurar a borrador']];
  return <Modal title={canManage ? 'Gestionar producto' : 'Detalle del producto'} onClose={onClose} dirty={dirty} busy={busy} error={error}>
    <div className="tw:space-y-6">
      <header><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3"><div><h3 className={s.heading}>{saved.name}</h3><p className={`tw:mt-2 ${s.muted}`}>{saved.vendor} · {saved.category}</p></div><span className={`${s.badge} ${statusColor(saved.status)}`}>{MARKET_STATUS_META[saved.status]?.label ?? saved.status}</span></div><p className={`tw:mt-3 ${s.muted}`}>Última modificación: {saved.updated_at ? new Date(saved.updated_at).toLocaleString('es-CL') : 'Sin datos'}</p></header>
      {notice && !dirty && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
      <div className="tw:grid tw:gap-5 tw:sm:grid-cols-[minmax(0,1fr)_200px]"><div className={s.notice}><p className="tw:font-semibold tw:text-ink">Precio referencial: {saved.price_clp == null ? 'Precio no informado' : `${saved.price_clp.toLocaleString('es-CL')} CLP`}</p><p className="tw:mt-2">La compra se realiza en el sitio del proveedor. AgeCare muestra una vitrina informativa.</p><a className="tw:mt-3 tw:inline-block tw:break-all tw:font-semibold tw:text-brand-ink" href={saved.external_url} target="_blank" rel="noopener noreferrer">Ver artículo en el sitio del proveedor ↗</a></div>{saved.image_url && <img src={saved.image_url} alt={saved.name} className="tw:h-40 tw:w-full tw:rounded-xl tw:bg-canvas tw:object-contain" />}</div>
      {canManage ? <>
        <form onSubmit={event => void handleSave(event)}><fieldset disabled={busy || confirmArchive} className={`${s.section} tw:min-w-0`}><h3 className="tw:font-bold">Editar información</h3><div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
          <label className={`${s.label} tw:sm:col-span-2`}>Nombre<input className={s.field} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} minLength={3} maxLength={160} required /></label>
          <label className={s.label}>Categoría<input className={s.field} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} minLength={2} maxLength={60} required /></label>
          <label className={s.label}>Proveedor<input className={s.field} value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} minLength={2} maxLength={120} required /></label>
          <label className={s.label}>Precio referencial CLP (opcional)<input className={s.field} value={form.price_clp} onChange={event => setForm({ ...form, price_clp: event.target.value })} type="number" min={0} step={1} /><span className={s.muted}>Vacío significa que el precio no está informado.</span></label>
          <label className={`${s.label} tw:sm:col-span-2`}>Enlace externo HTTPS<input className={s.field} value={form.external_url} onChange={event => setForm({ ...form, external_url: event.target.value })} type="url" pattern="https://.*" required /></label>
          <label className={`${s.label} tw:sm:col-span-2`}>Dirección de imagen (opcional)<input className={s.field} value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} type="url" /></label>
        </div><div className="tw:flex tw:justify-end"><button className={`${s.button} ${s.primary}`} type="submit" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></fieldset></form>
        <section className={s.section}><h3 className="tw:font-bold">Publicación del producto</h3><p className={s.muted}>{saved.status === 'draft' ? 'El borrador permanece guardado hasta que lo publiques.' : saved.status === 'published' ? 'Puedes retirarlo a borrador para seguir trabajando o archivarlo sin perder su ficha.' : 'El producto archivado conserva su información. Restáuralo a borrador para revisarlo antes de publicarlo de nuevo.'}</p>
          {confirmArchive ? <div className="tw:space-y-4"><p>¿Archivar <strong>{saved.name}</strong>? Conservará su información y podrás restaurarlo a borrador después.</p><div className={s.actions}><button className={s.button} type="button" disabled={busy} onClick={() => { setConfirmArchive(false); setError(''); }}>Cancelar archivo</button><button className={`${s.button} tw:text-negative`} type="button" disabled={busy} onClick={() => void handleStatus('archived')}>Confirmar archivo</button></div></div> : <div className={s.actions}>{transitions.map(([target, label]) => <button key={target} className={s.button} type="button" disabled={busy || dirty} onClick={() => target === 'archived' ? setConfirmArchive(true) : void handleStatus(target)}>{label}</button>)}</div>}
          {dirty && <p className={s.notice}>Guarda los cambios antes de cambiar el estado.</p>}
        </section>
      </> : <dl className="tw:grid tw:gap-5 tw:sm:grid-cols-2">{[['Nombre', saved.name], ['Categoría', saved.category], ['Proveedor', saved.vendor], ['Enlace externo', saved.external_url]].map(([label, value]) => <div key={label}><dt className={s.muted}>{label}</dt><dd className="tw:mt-1 tw:break-all tw:font-semibold">{value}</dd></div>)}</dl>}
      <details className={s.notice}><summary className="tw:cursor-pointer tw:font-semibold">Referencia del registro</summary><p className="tw:mt-2 tw:break-all">ID: {saved.id}</p></details>
    </div>
  </Modal>;
}
