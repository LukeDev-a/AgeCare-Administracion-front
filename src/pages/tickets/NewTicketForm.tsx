import { useState, type FormEvent } from 'react';
import { createTicket, TicketApiError, type NewTicketPayload, type TicketPriority } from '../../api/tickets';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';

interface NewTicketFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function NewTicketForm({ onCreated, onCancel }: NewTicketFormProps) {
  const { user } = useAuth();
  const canManage = canManageTickets(user?.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pending, setPending] = useState<NewTicketPayload | null>(null);
  const [error, setError] = useState('');

  async function save(payload: NewTicketPayload) {
    setIsSubmitting(true);
    setError('');
    try {
      await createTicket(payload);
      onCreated();
    } catch (err) {
      if (err instanceof TicketApiError && err.code === 'USER_NOT_FOUND') setPending(payload);
      else setError(err instanceof Error ? err.message : 'No fue posible crear el ticket.');
    } finally { setIsSubmitting(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await save({
        subject: String(data.get('subject') ?? ''),
        user_email: String(data.get('user_email') ?? ''),
        category: String(data.get('category') ?? 'other'),
        priority: (data.get('priority') as TicketPriority) ?? 'medium',
        description: String(data.get('description') ?? ''),
        channel: String(data.get('channel') ?? 'console'),
      });
  }

  if (!canManage) return null;

  return (
    <form className="ticket-form" onSubmit={event => void handleSubmit(event)}>
      {error && <p role="alert" className="wide">{error}</p>}
      {pending && <div className="wide" role="alert">
        <p>No se pudo enlazar {pending.user_email} con una cuenta. ¿Deseas crear el ticket sin enlace? Puedes volver para revisar el correo.</p>
        <button type="button" disabled={isSubmitting} onClick={() => void save({ ...pending, confirm_unlinked: true })}>Confirmar creación sin enlace</button>
        <button type="button" disabled={isSubmitting} onClick={() => setPending(null)}>Volver y revisar</button>
      </div>}
      <fieldset disabled={isSubmitting || !!pending} className="wide" style={{ border: 0, padding: 0, display: 'contents' }}>
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
      <label>Canal de origen
        <select name="channel" defaultValue="console">
          <option value="console">Consola</option><option value="phone">Teléfono</option>
          <option value="email">Correo</option><option value="app">Aplicación</option>
        </select>
      </label>
      </fieldset>
      <div className="ticket-form-actions">
        <button className="action-button" type="button" onClick={onCancel}>Cerrar formulario</button>
        <button className="action-button" type="submit" disabled={isSubmitting || !!pending}>
          {isSubmitting ? 'Guardando...' : 'Guardar ticket'}
        </button>
      </div>
    </form>
  );
}
