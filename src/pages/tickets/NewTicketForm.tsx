import { useState, type FormEvent } from 'react';
import { createTicket, type TicketPriority } from '../../api/tickets';

interface NewTicketFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function NewTicketForm({ onCreated, onCancel }: NewTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSubmitting(true);
    try {
      await createTicket({
        subject: String(data.get('subject') ?? ''),
        user_email: String(data.get('user_email') ?? ''),
        category: String(data.get('category') ?? 'other'),
        priority: (data.get('priority') as TicketPriority) ?? 'medium',
        description: String(data.get('description') ?? ''),
      });
      form.reset();
      onCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No fue posible crear el ticket.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={event => void handleSubmit(event)}>
      <label>
        Asunto
        <input name="subject" minLength={5} maxLength={160} required />
      </label>
      <label>
        Correo del usuario
        <input name="user_email" type="email" required />
      </label>
      <label>
        Categoría
        <select name="category" defaultValue="account_access">
          <option value="account_access">Acceso y cuenta</option>
          <option value="wearable_sync">Wearable y sincronización</option>
          <option value="alerts_push">Alertas y push</option>
          <option value="billing_plans">Pagos y planes</option>
          <option value="medications">Medicamentos</option>
          <option value="other">Otros</option>
        </select>
      </label>
      <label>
        Prioridad
        <select name="priority" defaultValue="medium">
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
      </label>
      <label className="wide">
        Descripción
        <textarea name="description" minLength={1} maxLength={8000} required />
      </label>
      <div className="ticket-form-actions">
        <button className="action-button" type="button" onClick={onCancel}>Cerrar formulario</button>
        <button className="action-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar ticket'}
        </button>
      </div>
    </form>
  );
}