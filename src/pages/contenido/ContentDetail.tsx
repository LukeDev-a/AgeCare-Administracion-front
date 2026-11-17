import { useEffect, useState, type FormEvent } from 'react';
import { changeContentPublication, publishContentWithoutAudio, scheduleContentWithoutAudio, contentAction, fetchContentAudio, deleteContent, updateContent, type ContentItem } from '../../api/content';
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
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmTextOnly, setConfirmTextOnly] = useState(false);
  const [exceptionScheduled, setExceptionScheduled] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null);
  const reviewConfirmed = reviewedVersion === item.text_version;
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
  const textDirty = title !== savedValues.title || body !== savedValues.body;
  const textApproved = !textDirty && item.approved_version === item.text_version;
  const canPublishTextOnly = item.status !== 'published' && textApproved && !item.audio_available
    && item.audio_status === 'failed' && !!item.audio_error;
  const canScheduleTextOnly = item.status === 'draft' && textApproved && !item.audio_available
    && (canPublishTextOnly || !!item.scheduled_without_audio);
  const validDate = !!scheduled && Number.isFinite(new Date(scheduled).getTime()) && new Date(scheduled).getTime() > scheduleNow;
  const exceptionActionReady = exceptionScheduled ? canScheduleTextOnly && validDate && !draftDirty : canPublishTextOnly && !dirty;
  const validException = exceptionReason.trim().length >= 5 && exceptionReason.trim().length <= 500 && reviewConfirmed;
  const scheduleReason = item.status !== 'draft' ? 'Solo los borradores admiten una publicación programada.'
    : draftDirty ? 'Guarda primero los cambios del texto y las etiquetas.'
      : item.approved_version !== item.text_version ? 'Falta aprobar la versión actual del texto.'
        : !item.audio_available ? 'Falta el audio vigente de la versión aprobada.'
          : !scheduled || new Date(scheduled).getTime() <= scheduleNow ? 'Elige una fecha y hora futuras.'
            : !scheduleDirty ? 'La fecha mostrada ya está guardada en la programación.' : '';
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);
  useEffect(() => {
    onEditingChange?.(draftDirty || busy || confirmTextOnly || confirmPublish);
    return () => onEditingChange?.(false);
  }, [draftDirty, busy, confirmTextOnly, confirmPublish, onEditingChange]);

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
    if (busy || dirty || (item.status !== 'published' && (!item.audio_available || item.approved_version !== item.text_version))) return;
    setIsPublishing(true);
    setError('');
    try {
      await changeContentPublication(item.id, item.status === 'published');
      setConfirmPublish(false);
      setNotice(item.status === 'published' ? 'Contenido retirado.' : 'Contenido publicado.');
      onChanged();
      if (item.status !== 'published') onClose();
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

  async function handlePublishTextOnly() {
    if (busy || !exceptionActionReady || !validException) return;
    if (exceptionScheduled && new Date(scheduled).getTime() <= Date.now()) {
      setScheduleNow(Date.now()); setError('Elige una fecha y hora futuras.'); return;
    }
    setIsPublishing(true); setError('');
    try {
      if (exceptionScheduled) {
        const saved = await scheduleContentWithoutAudio(item.id, item.text_version, exceptionReason.trim(), reviewConfirmed, new Date(scheduled).toISOString());
        acceptSaved(saved); setConfirmTextOnly(false); setReviewedVersion(null);
        setNotice('Publicación programada. Se publicará en la fecha elegida aunque el audio siga sin estar disponible.');
      } else {
        await publishContentWithoutAudio(item.id, item.text_version, exceptionReason.trim(), reviewConfirmed);
        onChanged(); onClose();
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No fue posible publicar sin audio.');
    } finally { setIsPublishing(false); }
  }

  const status = CONTENT_STATUS_META[item.status] ?? CONTENT_STATUS_META.draft;
  const statusLabel = item.status === 'published' && !item.audio_available ? 'Publicado sin audio' : status.label;

  return (
    <Modal title={confirmTextOnly ? exceptionScheduled ? 'Programar sin audio' : 'Publicar sin audio' : confirmDelete ? 'Eliminar contenido' : confirmPublish ? 'Confirmar publicación inmediata' : 'Editar, aprobar y publicar contenido'} onClose={onClose} dirty={dirty || (confirmTextOnly && !!exceptionReason.trim())} busy={busy} error={error}>
    {confirmTextOnly ? <section className="tw:space-y-5 tw:p-3 tw:sm:p-5" aria-label={exceptionScheduled ? 'Confirmar programación sin audio' : 'Confirmar publicación sin audio'}>
      <h3 className={ui.heading}>{exceptionScheduled ? '¿Programar la publicación aunque falte el audio?' : '¿Quieres publicar únicamente el texto?'}</h3>
      <p className="tw:rounded-xl tw:bg-canvas tw:p-5 tw:font-semibold tw:break-words">{item.title}</p>
      {exceptionScheduled ? <p className={ui.notice}>Se publicará el {ticketDate(new Date(scheduled).toISOString())}. Si el audio está listo, se incluirá; si sigue faltando, se publicará solo el texto. La aprobación del texto deberá seguir vigente.</p>
        : <p>Se publicará ahora y las personas podrán leerlo, pero no escucharlo. Podrás volver a solicitar el audio después.</p>}
      {!exceptionScheduled && item.publish_at && <p className={ui.notice}>Se eliminará la programación del {ticketDate(item.publish_at)}. Esta excepción no espera a la fecha elegida.</p>}
      <label className="tw:block tw:space-y-2">Motivo para publicar sin audio
        <textarea className={ui.field} rows={3} minLength={5} maxLength={500} value={exceptionReason} disabled={busy}
          placeholder="Por ejemplo: no se pudo generar el audio y se decidió publicar el texto revisado."
          onChange={event => setExceptionReason(event.target.value)} />
      </label>
      <p className={ui.description}>Entre 5 y 500 caracteres. El motivo, la versión y tu decisión quedarán registrados en auditoría.</p>
      <label className="tw:flex tw:items-start tw:gap-3"><input className="tw:mt-1 tw:size-5 tw:shrink-0" type="checkbox" checked={reviewConfirmed} disabled={busy}
        onChange={event => setReviewedVersion(event.target.checked ? item.text_version : null)} />
        <span>Revisé el texto y confirmo que es adecuado para publicarlo sin audio, incluido el aviso de fallo del proveedor.</span>
      </label>
      <div className={`${ui.actions} tw:justify-end`}>
        <button type="button" className={ui.button} disabled={busy} onClick={() => { setConfirmTextOnly(false); setError(''); }}>{exceptionScheduled ? 'Volver sin programar' : 'Volver sin publicar'}</button>
        <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy || !exceptionActionReady || !validException}
          onClick={() => void handlePublishTextOnly()}>{isPublishing ? exceptionScheduled ? 'Programando…' : 'Publicando…' : exceptionScheduled ? 'Confirmar y programar sin audio' : 'Confirmar y publicar sin audio'}</button>
      </div>
    </section> : confirmPublish ? <section className="tw:space-y-5 tw:p-3 tw:sm:p-5" aria-label="Confirmar publicación inmediata">
      <h3 className={ui.heading}>¿Quieres publicar este contenido ahora?</h3>
      <p className="tw:rounded-xl tw:bg-canvas tw:p-5 tw:font-semibold tw:break-words">{item.title}</p>
      {item.publish_at ? <div className={ui.notice}>
        <p>La publicación está programada para el {ticketDate(item.publish_at)}.</p>
        <p>Si confirmas, el contenido se publicará inmediatamente y se eliminará esa programación. No se esperará a la fecha elegida.</p>
      </div> : <p>El contenido se publicará inmediatamente, sin esperar una fecha programada.</p>}
      <div className={`${ui.actions} tw:justify-end`}>
        <button type="button" className={ui.button} disabled={busy} onClick={() => { setConfirmPublish(false); setError(''); }}>{item.publish_at ? 'Volver y conservar programación' : 'Volver sin publicar'}</button>
        <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy || dirty || !item.audio_available || item.approved_version !== item.text_version} onClick={() => void handleTogglePublish()}>{isPublishing ? 'Publicando…' : 'Confirmar y publicar ahora'}</button>
      </div>
    </section> : confirmDelete ? <section className="tw:space-y-5 tw:p-3 tw:sm:p-5" aria-label="Confirmar eliminación del contenido">
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
        <span className={`chip ${status.className} tw:px-3 tw:py-1.5 tw:text-sm`}>{statusLabel}</span>
      </div>
      <dl className="tw:grid tw:gap-4 tw:md:grid-cols-3">
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Texto editorial</dt><dd className="tw:mt-2 tw:font-bold">{textApproved ? 'Versión aprobada' : 'Pendiente de aprobación'}</dd></div>
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Audio de esta versión</dt><dd className="tw:mt-2 tw:font-bold">{!textApproved ? 'Pendiente de aprobación del texto' : item.audio_available ? 'Disponible para escuchar' : item.audio_status === 'ready' ? 'Audio no disponible' : AUDIO_STATES[item.audio_status] || 'Pendiente'}</dd></div>
        <div className="tw:rounded-xl tw:bg-canvas tw:p-5"><dt className="tw:text-sm tw:text-muted">Publicación</dt><dd className="tw:mt-2 tw:font-bold">{statusLabel}</dd><dd className="tw:mt-2 tw:text-sm tw:text-muted">{item.publish_at ? `Programada: ${ticketDate(item.publish_at)}` : 'Sin fecha programada'}</dd></div>
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
          {!textApproved && <p role="status" className={ui.notice}>{textDirty ? 'Guarda los cambios y después aprueba la nueva versión del texto para solicitar su audio.' : 'El texto está pendiente de aprobación. Pulsa «Aprobar texto y generar audio» para iniciar la preparación del audio de esta versión.'}</p>}
          {textApproved && item.audio_status === 'queued' && <p role="status" className={ui.notice}><span aria-hidden="true" className="tw:mr-3 tw:inline-block tw:size-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Estamos preparando el audio. El estado se actualiza automáticamente; no necesitas guardar de nuevo.{dirty ? ' La actualización automática está pausada mientras tengas cambios sin guardar.' : ''}</p>}
          {textApproved && item.audio_status === 'waiting_quota' && <p role="status" className={ui.notice}>El audio está esperando disponibilidad de la cuota gratuita. La solicitud se conserva; no necesitas aprobar el texto otra vez. Pulsa «Actualizar contenido» más adelante para consultar el avance.</p>}
          {textApproved && item.audio_available && <p role="status" className={ui.notice}>Audio listo. Pulsa «Escuchar audio vigente» para revisarlo y después continúa con la publicación.</p>}
          <div className={ui.actions}><button className={ui.button} type="button" disabled={busy || dirty || item.approved_version === item.text_version} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'approve', item.text_version); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo aprobar.'); } finally { setIsSaving(false); }
          }}>{isSaving ? 'Procesando…' : textApproved ? 'Texto aprobado' : 'Aprobar texto y generar audio'}</button>
          <button className={ui.button} type="button" disabled={busy || dirty || item.approved_version !== item.text_version || ['queued', 'waiting_quota'].includes(item.audio_status)} onClick={async () => {
            setIsSaving(true); setError(''); try { await contentAction(item.id, 'audio/retry'); onChanged(); } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo solicitar audio.'); } finally { setIsSaving(false); }
          }}>Reintentar audio</button>
          {textApproved && item.audio_available && <button className={ui.button} type="button" onClick={async () => {
            try { setAudio(URL.createObjectURL(await fetchContentAudio(item.id))); } catch (exception) { setError(exception instanceof Error ? exception.message : 'Audio no disponible.'); }
          }}>Escuchar audio vigente</button>}</div>
          {draftDirty && <p className={ui.notice}>Guarda los cambios del formulario antes de continuar con la aprobación o publicación.</p>}
          {textApproved && item.audio_error && <p className={ui.error}>{CONTENT_ERRORS[item.audio_error] || 'El audio requiere revisión'}. El contenido se conserva.</p>}
          {textApproved && audio && <audio className="tw:w-full" controls src={audio} />}
        </div>
        <div className={`${ui.step} tw:col-span-full`}><h3 className={ui.heading}>3. Publicar o programar</h3>
          {item.status === 'draft' ? <div className="tw:space-y-4">
            <label>Fecha de publicación (hora local)<input type="datetime-local" value={scheduled} disabled={busy || draftDirty || item.approved_version !== item.text_version || (!item.audio_available && !canScheduleTextOnly)} aria-describedby="content-schedule-help" onChange={event => { setScheduled(event.target.value); setScheduleNow(Date.now()); }} /></label>
            <p id="content-schedule-help" className="tw:text-sm tw:text-muted">{canScheduleTextOnly ? 'Elige una fecha futura y pulsa «Programar sin audio» para confirmar la excepción.' : scheduleReason || 'El texto y el audio están listos. Confirma la fecha con «Programar publicación».'}</p>
            {savedValues.scheduled && <p className={ui.notice}>{item.scheduled_without_audio
              ? `Fecha programada: ${savedValues.scheduled.replace('T', ' ')}. Se publicará aunque falte el audio; si está listo, se incluirá.`
              : item.approved_version !== item.text_version || !item.audio_available
              ? 'La fecha guardada se conserva, pero la publicación está pendiente de nueva aprobación y audio vigente.'
              : `Fecha programada: ${savedValues.scheduled.replace('T', ' ')} (hora local).`}</p>}
            <div className={ui.actions}>{!canScheduleTextOnly && <button className={`${ui.button} ${ui.primary}`} type="button" disabled={busy || !!scheduleReason} onClick={() => void handleSchedule()}>{isScheduling ? 'Actualizando programación…' : 'Programar publicación'}</button>}
              {canScheduleTextOnly && <button className={`${ui.button} ${ui.primary}`} type="button" disabled={busy || draftDirty || !validDate || (!!item.scheduled_without_audio && !scheduleDirty)}
                onClick={() => { setExceptionScheduled(true); setConfirmTextOnly(true); setError(''); }}>Programar sin audio</button>}
              {savedValues.scheduled && <button className={ui.button} type="button" disabled={busy || draftDirty} onClick={() => void handleSchedule(true)}>Cancelar programación</button>}
            </div>
            <p className="tw:text-sm tw:text-muted">Guardar el borrador no programa la fecha. La programación habitual exige audio vigente; la excepción permite publicar el texto sin audio en la fecha confirmada.</p>
          </div> : <p className={ui.notice}>{item.status === 'archived' ? 'Este contenido está archivado. Solo los borradores admiten una fecha programada. Puedes volver a publicarlo manualmente.' : 'Este contenido ya está publicado. La programación solo está disponible para borradores.'}</p>}
          <p className={ui.description}>{item.status === 'published' ? 'El contenido está publicado. Puedes retirarlo del catálogo cuando lo necesites.' : dirty ? 'Primero guarda los cambios del formulario.' : item.approved_version !== item.text_version ? 'Falta aprobar la versión actual del texto.' : canPublishTextOnly ? 'El audio falló. Puedes reintentarlo o publicar solo el texto mediante una confirmación.' : !item.audio_available ? 'Falta que el audio de la versión aprobada esté disponible.' : 'El texto está aprobado y el audio está disponible. Puedes continuar con la publicación.'}</p>
          {item.status === 'draft' && savedValues.scheduled && <p className={ui.notice}>Ya tiene una fecha programada. No necesitas pulsar «Publicar ahora»: úsalo solo si quieres adelantar la publicación y eliminar la programación.</p>}
          <div className={ui.actions}><button className={`${ui.button} ${ui.primary}`} type="button" disabled={busy || dirty || (item.status !== 'published' && (!item.audio_available || item.approved_version !== item.text_version))} onClick={() => {
            if (item.status === 'published') void handleTogglePublish();
            else { setError(''); setConfirmPublish(true); }
          }}>
            {isPublishing ? 'Actualizando...' : item.status === 'published' ? 'Retirar' : 'Publicar ahora'}
          </button>
          {canPublishTextOnly && <button className={ui.button} type="button" disabled={busy || dirty}
            onClick={() => { setError(''); setExceptionScheduled(false); setConfirmTextOnly(true); }}>Publicar sin audio</button>}
          {user?.role === 'admin' && <button className={`${ui.button} tw:text-negative`} type="button" disabled={busy || item.status === 'published'} onClick={() => { setError(''); setConfirmDelete(true); }}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>}</div>
        </div>
        <p className={`${ui.description} tw:col-span-full`}>Editar el texto requiere nueva aprobación e invalida el audio y la autorización de publicación sin audio.</p>
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
