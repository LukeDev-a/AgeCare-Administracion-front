import { useState, type FormEvent } from 'react';
import { createProduct } from '../../api/marketplace';

interface NewProductFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function NewProductForm({ onCreated, onCancel }: NewProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const priceRaw = String(data.get('price_clp') ?? '').trim();
    const imageUrl = String(data.get('image_url') ?? '').trim();
    setIsSubmitting(true);
    try {
      await createProduct({
        name: String(data.get('name') ?? ''),
        category: String(data.get('category') ?? ''),
        vendor: String(data.get('vendor') ?? ''),
        external_url: String(data.get('external_url') ?? ''),
        ...(priceRaw ? { price_clp: Number(priceRaw) } : {}),
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
      form.reset();
      onCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible crear el producto.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={event => void handleSubmit(event)}>
      <label>
        Nombre
        <input name="name" minLength={3} maxLength={160} required />
      </label>
      <label>
        Categoría
        <input name="category" minLength={2} maxLength={60} required />
      </label>
      <label>
        Proveedor
        <input name="vendor" minLength={2} maxLength={120} required />
      </label>
      <label>
        Precio CLP
        <input name="price_clp" type="number" min={0} />
      </label>
      <label className="wide">
        Enlace externo HTTPS
        <input name="external_url" type="url" required />
      </label>
      <label className="wide">
        Imagen HTTPS (opcional)
        <input name="image_url" type="url" />
      </label>
      <div className="ticket-form-actions">
        <button className="action-button" type="button" onClick={onCancel}>Cerrar formulario</button>
        <button className="action-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar producto'}
        </button>
      </div>
    </form>
  );
}