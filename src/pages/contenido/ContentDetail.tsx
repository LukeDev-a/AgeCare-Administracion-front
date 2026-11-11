import { useEffect, useState, type FormEvent } from 'react';
import { changeContentPublication, contentAction, fetchContentAudio, deleteContent, updateContent, type ContentItem } from '../../api/content';
import { useAuth } from '../../auth/AuthContext';
import { AUDIO_STATES, CONTENT_STATUS_META, CONTENT_TYPES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';
import { contentStyles as ui } from './contentStyles';
import { Modal } from '../../components/Modal';

interface ContentDetailProps {
  item: ContentItem;
  onChanged: (saved?: ContentItem) => void;
  onDeleted: () => void;
  onEditingChange?: (editing: boolean) => void;
  onClose?: () => void;
}

export function ContentDetail({ item, onChanged, onDeleted, onEditingChange, onClose = () => {} }: ContentDetailProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [body, setBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduled, setScheduled] = useState(item.publish_at ? localDate(item.publish_at) : '');
  const [audio, setAudio] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedValues, setSavedValues] = useState(editableValues(item));
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());
  const busy = isSaving || isPublishing || isDeleting || isScheduling;
  const draftDirty = title !== savedValues.title || body !== savedValues.body || normalizedTags(tags) !== savedValues.tags;
  const scheduleDirty = normalizedSchedule(scheduled) !== normalizedSchedule(savedValues.scheduled);
  const dirty = draftDirty || scheduleDirty;
  const scheduleReason = item.status !== 'draft' ? 'Solo los borradores admiten una publicación programada.'
    : draftDirty ? 'Guarda primero los cambios del texto y las etiquetas.'
      : item.approved_version !== item.text_version ? 'Falta aprobar la versión actual del texto.'
        : !item.audio_available ? 'Falta el audio vigente de la versión aprobada.'
          : !scheduled || new Date(scheduled).getTime() <= scheduleNow ? 'Elige una fecha y hora futuras.'
            : !scheduleDirty ? 'La fecha mostrada ya está guardada en la programación.' : '';
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);
  useEffect(() => {
    onEditingChange?.(draftDirty || busy);
    return () => onEditingChange?.(false);
  }, [draftDirty, busy, onEditingChange]);

  function acceptSaved(saved: ContentItem) {
    const values = editableValues(saved);
    setTitle(values.title); setBody(values.body); setTags(values.tags); setScheduled(values.scheduled);
    setSavedValues(values);
    onChanged(saved);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await updateContent(item.id, {
        title,
        body,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
      acceptSaved(saved);
      setNotice(item.status === 'draft' ? 'Borrador guardado.' : 'Cambios guardados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el contenido.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSchedule(cancel = false) {
    if (busy || item.status !== 'draft' || draftDirty) return;
    if (!cancel && new Date(scheduled).getTime() <= Date.now()) {
      setScheduleNow(Date.now()); setError('Elige una fecha y hora futuras para programar la publicación.'); return;
    }
    if (!cancel && scheduleReason) return;
    setIsScheduling(true); setError(''); setNotice('');
    try {
      const saved = await updateContent(item.id, { publish_at: cancel ? null : new Date(scheduled).toISOString() });
      acceptSaved(saved);
      setNotice(cancel ? 'Programación cancelada. El contenido continúa como borrador.' : 'Publicación programada.');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No fue posible actualizar la programación.');
    } finally { setIsScheduling(false); }
  }

  async function handleTogglePublish() {
    setIsPublishing(true);
    setError('');
    try {
      await changeContentPublication(item.id, item.status === 'published');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cambiar el estado.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDelete() {
    if (busy || user?.role !== 'admin' || item.status === 'published') return;
    setIsDeleting(true);
    setError('');
    try {
      await deleteContent(item.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar el contenido.');
      setIsDeleting(false);
    }
  }

  const status = CONTENT_STATUS_META[item.status] ?? CONTENT_STATUS_META.draft;

  return (
    <Modal title={confirmDelete ? 'Eliminar contenido' : 'Editar, aprobar y publicar contenido'} onClose={onClose} dirty={dirty} busy={busy} error={error}>
    {confirmDelete ? <section className="tw:space-y-5 tw:p-3 tw:sm:p-5" aria-label="Confirmar eliminación del contenido">
      <h3 className={ui.heading}>¿Quieres eliminar este contenido?</h3>
      <p className="tw:rounded-xl tw:bg-canvas tw:p-5 tw:font-semibold tw:break-words">{item.title}</p>
      <p>Dejará de aparecer en el catálogo. Su registro e historial se conservan en la base de datos, pero no podrás restaurarlo desde esta consola.</p>
      {dirty && <p className={ui.error}>También se descartarán los cambios del formulario que no hayas guardado.</p>}
      <div className={`${ui.actions} tw:justify-end tw:border-t tw:border-solid tw:border-stroke tw:pt-5`}>
        <button type="button" autoFocus className={ui.button} disabled={busy} onClick={() => { setConfirmDelete(false); setError(''); }}>Cancelar eliminación</button>
        <button type="button" className={`${ui.button} tw:text-negative`} disabled={busy} onClick={() => void handleDelete()}>{isDeleting ? 'Eliminando...' : 'Confirmar eliminación'}</button>
      </div>
    </section> :
    <div className={`${ui.panel} tw:space-y-6`} aria-label="Edición y publicación del contenido">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4">
        <div>
          <h2 className="tw:max-w-3xl tw:text-2xl tw:font-bold tw:break-words">{item.title}</h2>
          <p className={ui.description}>{CONTENT_TYPES[item.type] ?? item.type} · Última modificación: {ticketDate(item.updated_at)}</p>
        </div>
        <span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm`}>{status.label}</span>
      </div>
      <dl className="tw:grid tw:gap-4 tw:md:grid-cols-3">
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Texto editorial</dt><dd className="tw:mt-2 tw:font-bold">{item.approved_version === item.text_version ? 'Versión aprobada' : 'Pendiente de aprobación'}</dd></div>
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Audio de esta versión</dt><dd className="tw:mt-2 tw:font-bold">{item.audio_available ? 'Disponible para escuchar' : item.audio_status === 'ready' ? 'Audio no disponible' : AUDIO_STATES[item.audio_status] || 'Pendiente'}</dd></div>
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Publicación</dt><dd className="tw:mt-2 tw:font-bold">{status.label}</dd><dd className="tw:mt-2 tw:text-sm tw:text-muted">{item.publish_at ? `Programada: ${ticketDate(item.publish_at)}` : 'Sin fecha programada'}</dd></div>
      </dl>
      <form className={ui.form} onSubmit={event => void handleSave(event)}>
        {item.provenance && <details className={`${ui.step} tw:col-span-full`}><summary className="tw:cursor-pointer tw:font-semibold">Fuente y procedencia del texto</summary><p>Fuente: {item.provenance.source} · {item.provenance.author || 'Autor sin identificar'}</p>
          <a className="tw:font-semibold tw:text-brand-ink tw:underline" href={item.provenance.url} target="_blank" rel="noreferrer">Leer original</a>
          {item.provenance.license_url && <p><a className="tw:text-brand-ink tw:underline" href={item.provenance.license_url} target="_blank" rel="noreferrer">{item.provenance.license}</a> · {item.provenance.changes}</p>}</details>}
        <div className="tw:col-span-full"><h3 className={ui.heading}>1. Revisar y guardar el texto</h3><p className={ui.description}>Corrige el título y el contenido. Separa las etiquetas con comas.</p></div>
        <label>
          Título
          <input value={title} disabled={busy} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={160} required />
        </label>
        <label>
          Etiquetas
          <input value={tags} disabled={busy} onChange={event => setTags(event.target.value)} />
        </label>
        <label className="tw:col-span-full">
          Contenido
          <textarea rows={8} value={body} disabled={busy} onChange={event => setBody(event.target.value)} minLength={10} maxLength={4000} required />
        </label>
        <div className="tw:col-span-full tw:space-y-5">
          <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={busy}>
            {isSaving ? 'Guardando...' : item.status === 'draft' ? 'Guardar borrador' : 'Guardar cambios'}
          </button>
          {notice && !dirty && <p role="status" className={ui.notice}>{notice}</p>}
        </div>
        <div className={`${ui.step} tw:col-span-full`}><h3 className={ui.heading}>2. Aprobar el texto y preparar el audio</h3>
          <p className={ui.description}>La aprobación solicita el audio de esta versión. Cuando esté disponible, escúchalo antes de publicar.</p>
          {item.audio_status === 'queued' && <p role="status" className={ui.notice}><span aria-hidden="true" className="tw:mr-3 tw:inline-block tw:size-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Estamos preparando el audio. El estado se actualiza automáticamente; no necesitas guardar de nuevo.{dirty ? ' La actualización automática está pausada mientras tengas cambios sin guardar.' : ''}</p>}
          {item.audio_status === 'waiting_quota' && <p role="status" className={ui.notice}>El audio está esperando disponibilidad de la cuota gratuita. La solicitud se conserva; no necesitas aprobar el texto otra vez. Pulsa «Actualizar contenido» más adelante para consultar el avance.</p>}
          {item.audio_available && <p role="status" className={ui.notice}>Audio listo. Pulsa «Escuchar audio vigente» para revisarlo y después continúa con la publicación.</p>}
          <div className={ui.actions}><button className={ui.button} type="button" disabled={busy || dirty || item.approved_version === item.text_version} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'approve', item.text_version); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo aprobar.'); } finally { setIsSaving(false); }
          }}>{isSaving ? 'Procesando…' : item.approved_version === item.text_version ? 'Texto aprobado' : 'Aprobar texto y generar audio'}</button>
          <button className={ui.button} type="button" disabled={busy || dirty || item.approved_version !== item.text_version || ['queued', 'waiting_quota'].includes(item.audio_status)} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'audio/retry'); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo solicitar audio.'); } finally { setIsSaving(false); }
          }}>Reintentar audio</button>
          {item.audio_available && <button className={ui.button} type="button" onClick={async () => {
            try { setAudio(URL.createObjectURL(await fetchContentAudio(item.id))); } catch (exception) { setError(exception instanceof Error ? exception.message : 'Audio no disponible.'); }
          }}>Escuchar audio vigente</button>}</div>
          {draftDirty && <p className={ui.notice}>Guarda los cambios del formulario antes de continuar con la aprobación o publicación.</p>}
          {item.audio_error && <p className={ui.error}>{CONTENT_ERRORS[item.audio_error] || 'El audio requiere revisión'}. El contenido se conserva.</p>}
          {audio && <audio className="tw:w-full" controls src={audio} />}
        </div>
        <div className={`${ui.step} tw:col-span-full`}><h3 className={ui.heading}>3. Publicar o programar</h3>
          {item.status === 'draft' ? <div className="tw:space-y-4">
            <label>Fecha de publicación (hora local)<input type="datetime-local" value={scheduled} disabled={busy || draftDirty || item.approved_version !== item.text_version || !item.audio_available} aria-describedby="content-schedule-help" onChange={event => { setScheduled(event.target.value); setScheduleNow(Date.now()); }} /></label>
            <p id="content-schedule-help" className="tw:text-sm tw:text-muted">{scheduleReason || 'El texto y el audio están listos. Confirma la fecha con «Programar publicación».'}</p>
            {savedValues.scheduled && <p className={ui.notice}>{item.approved_version !== item.text_version || !item.audio_available
              ? 'La fecha guardada se conserva, pero la publicación está pendiente de nueva aprobación y audio vigente.'
              : `Fecha programada: ${savedValues.scheduled.replace('T', ' ')} (hora local).`}</p>}
            <div className={ui.actions}><button className={`${ui.button} ${ui.primary}`} type="button" disabled={busy || !!scheduleReason} onClick={() => void handleSchedule()}>{isScheduling ? 'Actualizando programación…' : 'Programar publicación'}</button>
              {savedValues.scheduled && <button className={ui.button} type="button" disabled={busy || draftDirty} onClick={() => void handleSchedule(true)}>Cancelar programación</button>}
            </div>
            <p className="tw:text-sm tw:text-muted">Guardar el borrador no programa la fecha. Una vez programado, se publicará automáticamente si conserva la aprobación y el audio vigentes.</p>
          </div> : <p className={ui.notice}>{item.status === 'archived' ? 'Este contenido está archivado. Solo los borradores admiten una fecha programada. Puedes volver a publicarlo manualmente.' : 'Este contenido ya está publicado. La programación solo está disponible para borradores.'}</p>}
          <p className={ui.description}>{item.status === 'published' ? 'El contenido está publicado. Puedes retirarlo del catálogo cuando lo necesites.' : dirty ? 'Primero guarda los cambios del formulario.' : item.approved_version !== item.text_version ? 'Falta aprobar la versión actual del texto.' : !item.audio_available ? 'Falta que el audio de la versión aprobada esté disponible.' : 'El texto está aprobado y el audio está disponible. Puedes continuar con la publicación.'}</p>
          <div className={ui.actions}><button className={`${ui.button} ${ui.primary}`} type="button" disabled={busy || dirty || (item.status !== 'published' && (!item.audio_available || item.approved_version !== item.text_version))} onClick={() => void handleTogglePublish()}>
            {isPublishing ? 'Actualizando...' : item.status === 'published' ? 'Retirar' : 'Publicar'}
          </button>
          {user?.role === 'admin' && <button className={`${ui.button} tw:text-negative`} type="button" disabled={busy || item.status === 'published'} onClick={() => { setError(''); setConfirmDelete(true); }}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>}</div>
        </div>
        <p className={`${ui.description} tw:col-span-full`}>La edición del texto requiere nueva aprobación e invalida el audio anterior. La publicación programada espera aprobación y audio.</p>
      </form>
    </div>}</Modal>
  );
}

function localDate(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function normalizedTags(value: string) {
  return value.split(',').map(tag => tag.trim()).filter(Boolean).join(', ');
}

function normalizedSchedule(value: string) {
  return value ? new Date(value).getTime() : null;
}

function editableValues(item: ContentItem) {
  return { title: item.title, body: item.body, tags: normalizedTags(item.tags.join(', ')),
    scheduled: item.publish_at ? localDate(item.publish_at) : '' };
}
