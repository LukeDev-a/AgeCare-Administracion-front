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
    setIsSubmitting(true); setError('');
    try {
      await createProduct({ name: form.name, category: form.category, vendor: form.vendor, external_url: form.external_url,
        ...(form.price_clp.trim() ? { price_clp: Number(form.price_clp) } : {}), ...(form.image_url.trim() ? { image_url: form.image_url.trim() } : {}) });
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible crear el producto.'); }
    finally { setIsSubmitting(false); }
  }
  if (!canManage) return null;
  return <Modal title="Crear producto" onClose={onCancel} dirty={dirty} busy={isSubmitting} error={error}>
    <form onSubmit={event => void handleSubmit(event)}><fieldset disabled={isSubmitting} className="tw:min-w-0 tw:space-y-6 tw:border-0">
      <p className={s.notice}>El producto se guardará como borrador. Después podrás revisar su ficha y publicarlo.</p>
      <section className={s.section}><h3 className="tw:font-bold">Información del producto</h3><div className="tw:grid tw:gap-5 tw:sm:grid-cols-2">
        <label className={`${s.label} tw:sm:col-span-2`}>Nombre<input className={s.field} name="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} minLength={3} maxLength={160} required /></label>
        <label className={s.label}>Categoría<input className={s.field} name="category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} minLength={2} maxLength={60} required /></label>
        <label className={s.label}>Proveedor<input className={s.field} name="vendor" value={form.vendor} onChange={event => setForm({ ...form, vendor: event.target.value })} minLength={2} maxLength={120} required /></label>
        <label className={s.label}>Precio referencial en CLP<input className={s.field} name="price_clp" type="number" min={0} step={1} value={form.price_clp} onChange={event => setForm({ ...form, price_clp: event.target.value })} /><span className={s.muted}>Opcional. Vacío significa «Precio no informado»; cero es un precio válido.</span></label>
      </div></section>
      <section className={s.section}><h3 className="tw:font-bold">Enlaces e imagen</h3>
        <label className={s.label}>Enlace externo HTTPS<input className={s.field} name="external_url" type="url" pattern="https://.*" placeholder="https://sitio-del-proveedor.cl/producto" value={form.external_url} onChange={event => setForm({ ...form, external_url: event.target.value })} required /><span className={s.muted}>La compra se realiza en el sitio del proveedor. La consola no procesa pagos.</span></label>
        <label className={s.label}>Dirección de imagen (opcional)<input className={s.field} name="image_url" type="url" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} /></label>
      </section><div className="tw:flex tw:justify-end"><button className={`${s.button} ${s.primary}`} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Guardar producto'}</button></div>
    </fieldset></form>
  </Modal>;
}
