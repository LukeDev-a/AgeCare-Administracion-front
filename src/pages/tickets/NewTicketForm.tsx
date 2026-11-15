import { useState, type FormEvent } from 'react';
import { createTicket, TicketApiError, type NewTicketPayload, type TicketPriority } from '../../api/tickets';
import { useAuth } from '../../auth/AuthContext';
import { canManageTickets } from '../../routes/permissions';
import { ticketStyles as ui } from './ticketStyles';
import { Modal } from '../../components/Modal';

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
  const [dirty, setDirty] = useState(false);

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
    <Modal title="Crear un ticket de soporte" onClose={onCancel} dirty={dirty} busy={isSubmitting}>
    <form className={`${ui.form} tw:[&_label]:content-start tw:[&_input]:font-sans tw:[&_input]:font-normal tw:[&_textarea]:font-sans tw:[&_textarea]:font-normal tw:[&_select]:font-normal`} onSubmit={event => void handleSubmit(event)} onChange={event => {
      const data = new FormData(event.currentTarget);
      setDirty(['subject', 'user_email', 'description'].some(key => String(data.get(key) ?? '') !== '')
        || data.get('category') !== 'account_access' || data.get('priority') !== 'medium' || data.get('channel') !== 'console');
    }}>
      <p className="tw:col-span-full tw:mt-0 tw:text-muted">Registra un problema o una solicitud de ayuda. El ticket permite organizar su atención y mantener el seguimiento del caso.</p>
      {error && <p role="alert" className={`${ui.error} tw:col-span-full`}>{error}</p>}
      {pending && <div className={`${ui.error} tw:col-span-full`} role="alert">
        <p className="tw:font-semibold">Revisa el correo de quien solicita ayuda</p>
        <p>No pudimos recuperar los datos del solicitante para {pending.user_email}. Esto no significa que el correo sea incorrecto ni que su cuenta no exista.</p>
        <p>Puedes crear el ticket sin enlace: conservaremos el correo y la solicitud, pero no se asociará una cuenta ni se completarán su perfil y plan. No se enviará un correo al crear el ticket.</p>
        <div className={`${ui.actions} tw:mt-4`}><button className={ui.button} type="button" disabled={isSubmitting} onClick={() => void save({ ...pending, confirm_unlinked: true })}>Confirmar creación sin enlace</button>
        <button className={ui.button} type="button" disabled={isSubmitting} onClick={() => setPending(null)}>Volver y revisar</button></div>
      </div>}
      <fieldset disabled={isSubmitting || !!pending} className="wide" style={{ border: 0, padding: 0, display: 'contents' }}>
      <label>
        Asunto
        <input name="subject" minLength={5} maxLength={160} required placeholder="Ej.: No puedo iniciar sesión" aria-describedby="ticket-subject-help" />
        <small id="ticket-subject-help" className="tw:font-normal tw:text-muted">Resume el problema en una frase, de 5 a 160 caracteres.</small>
      </label>
      <label>
        Correo de quien solicita ayuda
        <input name="user_email" type="email" required placeholder="persona@ejemplo.com" aria-describedby="ticket-email-help" />
        <small id="ticket-email-help" className="tw:font-normal tw:text-muted">Correo de la persona afectada, por ejemplo, un adulto mayor o su cuidador. Usa tu correo solo si la solicitud es tuya. Registrarlo no envía un correo.</small>
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
        <small className="tw:font-normal tw:text-muted">Elige el tema que mejor describa la solicitud.</small>
      </label>
      <label>
        Prioridad
        <select name="priority" defaultValue="medium">
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
        <small className="tw:font-normal tw:text-muted">Indica la urgencia de atención: baja, media, alta o crítica. No sustituye un canal de emergencias.</small>
      </label>
      <label className="tw:col-span-full">
        Descripción
        <textarea name="description" rows={5} minLength={1} maxLength={8000} required placeholder="¿Qué ocurrió, desde cuándo y qué estaba intentando hacer la persona?" aria-describedby="ticket-description-help" />
        <small id="ticket-description-help" className="tw:font-normal tw:text-muted">Incluye los detalles necesarios para ayudar. No escribas contraseñas, códigos MFA ni datos de salud innecesarios. Máximo 8000 caracteres.</small>
      </label>
      <label>¿Cómo llegó la solicitud?
        <select name="channel" defaultValue="console">
          <option value="console">Consola</option><option value="phone">Teléfono</option>
          <option value="email">Correo</option><option value="app">Aplicación</option>
        </select>
        <small className="tw:font-normal tw:text-muted">Teléfono si te llamaron, Correo si recibiste un mensaje, Aplicación si llegó desde la app o Consola si se registra directamente aquí. Esta opción solo indica el origen.</small>
      </label>
      </fieldset>
      <div className={`${ui.actions} tw:col-span-full tw:justify-end tw:border-t tw:border-solid tw:border-stroke tw:pt-5`}>
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={isSubmitting || !!pending}>
          {isSubmitting ? 'Guardando...' : 'Guardar ticket'}
        </button>
      </div>
    </form>
    </Modal>
  );
}
