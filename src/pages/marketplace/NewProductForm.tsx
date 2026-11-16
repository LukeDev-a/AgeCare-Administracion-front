import { useState, type FormEvent } from 'react';
import { createProduct } from '../../api/marketplace';
import { useAuth } from '../../auth/AuthContext';
import { canManageMarketplace } from '../../routes/permissions';
import { Modal } from '../../components/Modal';
import { marketStyles as s } from './marketStyles';
interface NewProductFormProps { onCreated: () => void; onCancel: () => void; }
const empty = { name: '', category: '', vendor: '', price_clp: '', external_url: '', image_url: '' };
export function NewProductForm({ onCreated, onCancel }: NewProductFormProps) {
  const { user } = useAuth();
  const canManage = canManageMarketplace(user?.role);
  const [form, setForm] = useState(empty);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dirty = Object.values(form).some(value => value !== '');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || isSubmitting) return;
    const required = { name: form.name.trim(), category: form.category.trim(), vendor: form.vendor.trim(), external_url: form.external_url.trim() };
    for (const [key, label, min, max] of [['name', 'El nombre', 3, 160], ['category', 'La categoría', 2, 60], ['vendor', 'El proveedor', 2, 120]] as const) {
      if (required[key].length < min || required[key].length > max) {
        setError(`${label} debe tener entre ${min} y ${max} caracteres, sin contar los espacios al inicio y al final.`); return;
      }
    }
    try {
      const url = new URL(required.external_url);
      if (url.protocol !== 'https:' || !url.hostname) throw new Error();
    } catch { setError('Indica el enlace externo obligatorio del producto, con una dirección HTTPS válida.'); return; }
    setIsSubmitting(true); setError('');
    try {
      await createProduct({ ...required,
        ...(form.price_clp.trim() ? { price_clp: Number(form.price_clp) } : {}), ...(form.image_url.trim() ? { image_url: form.image_url.trim() } : {}) });
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible crear el producto.'); }
    finally { setIsSubmitting(false); }
  }
  if (!canManage) return null;
  return <Modal title="Crear producto" onClose={onCancel} dirty={dirty} busy={isSubmitting} error={error}>
    <form onSubmit={event => void handleSubmit(event)}><fieldset disabled={isSubmitting} className="tw:min-w-0 tw:space-y-6 tw:border-0">
      <p className={s.notice}>El producto se guardará como borrador. Después podrás revisar su ficha y publicarlo.</p>
      <p className={s.muted}>Nombre, categoría, proveedor y enlace externo son obligatorios. Puedes guardar sin precio ni imagen.</p>
      <section className={s.section}><h3 className="tw:font-bold">Información del producto</h3><div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
        <label className={`${s.label} tw:sm:col-span-2`}>Nombre<input className={s.field} name="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} minLength={3} maxLength={160} required aria-describedby="product-name-help" /><small id="product-name-help" className={s.muted}>Obligatorio · De 3 a 160 caracteres.</small></label>
        <label className={s.label}>Categoría<input className={s.field} name="category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} minLength={2} maxLength={60} required aria-describedby="product-category-help" /><small id="product-category-help" className={s.muted}>Obligatoria · De 2 a 60 caracteres.</small></label>
        <label className={s.label}>Proveedor<input className={s.field} name="vendor" value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} minLength={2} maxLength={120} required aria-describedby="product-vendor-help" /><small id="product-vendor-help" className={s.muted}>Obligatorio · De 2 a 120 caracteres.</small></label>
        <label className={s.label}>Precio referencial en CLP (opcional)<input className={s.field} name="price_clp" type="number" min={0} step={1} value={form.price_clp} onChange={event => setForm({ ...form, price_clp: event.target.value })} /><span className={s.muted}>Vacío significa «Precio no informado»; cero es un precio válido.</span></label>
      </div></section>
      <section className={s.section}><h3 className="tw:font-bold">Enlaces e imagen</h3>
        <label className={s.label}>Enlace externo HTTPS (obligatorio)<input className={s.field} name="external_url" type="url" pattern="https://.*" placeholder="https://sitio-del-proveedor.cl/producto" value={form.external_url} onChange={event => setForm({ ...form, external_url: event.target.value })} required /><span className={s.muted}>La compra se realiza en el sitio del proveedor. La consola no procesa pagos.</span></label>
        <label className={s.label}>Enlace a la imagen (opcional)<input className={s.field} name="image_url" type="url" placeholder="https://sitio-del-proveedor.cl/imagen.jpg" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} /><span className={s.muted}>Pega la dirección de una imagen alojada en internet o deja el campo vacío.</span></label>
      </section><div className="tw:flex tw:justify-end"><button className={`${s.button} ${s.primary}`} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar producto'}</button></div>
    </fieldset></form>
  </Modal>;
}
