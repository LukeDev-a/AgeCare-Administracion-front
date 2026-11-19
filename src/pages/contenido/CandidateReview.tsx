import { useState } from 'react';
import { createCandidateDraft, requestAdaptation, reviewCandidate, type NewsCandidate } from '../../api/content';
import { CONTENT_ERRORS } from '../../lib/contentMeta';
import { Modal } from '../../components/Modal';
import { contentStyles as ui } from './contentStyles';

const choices = [
  { value: 'own', label: 'Original del medio', help: 'Verificaste la autoría y las condiciones de reutilización.' },
  { value: 'third_party', label: 'Material de terceros', help: 'El texto pertenece a otra persona o entidad.' },
  { value: 'uncertain', label: 'No está claro', help: 'Falta comprobar su origen o los permisos.' },
];
const primary = `${ui.button} tw:enabled:border-brand tw:enabled:bg-brand-soft tw:enabled:text-brand-ink`;

export function CandidateReview({ candidate, onChanged, onDraft, onClose, adaptationEnabled = true }: {
  candidate: NewsCandidate; onChanged: () => void; onDraft: (id: string, title: string) => void;
  onClose: () => void; adaptationEnabled?: boolean;
}) {
  const [step, setStep] = useState(candidate.item_id ? 3 : 1);
  const [title, setTitle] = useState(candidate.title.slice(0, 160));
  const [body, setBody] = useState(candidate.original_text.slice(0, 4000));
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestingAdaptation, setRequestingAdaptation] = useState(false);
  const [acceptedFor, setAcceptedFor] = useState<NewsCandidate | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [usedProposal, setUsedProposal] = useState(false);
  const [createdDraft, setCreatedDraft] = useState<{ id: string; title: string } | null>(null);
  const draft = createdDraft || (candidate.item_id ? { id: candidate.item_id, title: candidate.title } : null);
  const textEdited = title !== candidate.title.slice(0, 160) || body !== candidate.original_text.slice(0, 4000);
  const dirty = !!note.trim() || (choice !== null && choice !== candidate.rights_status)
    || (!draft && textEdited);
  const selectedChoice = choice ?? candidate.rights_status;
  const rightsLabel = choices.find(option => option.value === candidate.rights_status)?.label || 'Sin revisar';
  const canReview = !busy && note.trim().length >= 5;
  // Mostrar aceptación inmediatamente, hasta recibir el candidato actualizado por GET.
  const adaptationStatus = acceptedFor === candidate ? 'queued' : candidate.status;
  const waiting = ['queued', 'waiting_quota'].includes(adaptationStatus);
  const proposalReady = !!candidate.adaptation && !waiting && !requestingAdaptation && adaptationStatus !== 'failed';

  async function askAdaptation() {
    if (busy || waiting || !adaptationEnabled || draft || candidate.status === 'discarded') return;
    setBusy(true); setRequestingAdaptation(true); setError(''); setNotice('');
    try {
      await requestAdaptation(candidate.id);
      setAcceptedFor(candidate);
      setConfirmReplace(false);
      onChanged();
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo solicitar la adaptación. Intenta nuevamente.'); }
    finally { setBusy(false); setRequestingAdaptation(false); }
  }

  async function action(task: () => Promise<unknown>, message: string, reviewed = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      await task();
      if (reviewed) { setNote(''); setChoice(null); }
      onChanged(); setNotice(message);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar la acción.'); }
    finally { setBusy(false); }
  }

  function applyProposal() {
    if (!candidate.adaptation) return;
    setTitle(candidate.adaptation.title); setBody(candidate.adaptation.body);
    setUsedProposal(true); setConfirmReplace(false); setStep(3);
    setNotice('Propuesta copiada. Revisa el texto y guarda el borrador.');
  }

  return <Modal title="Revisar y preparar noticia" onClose={onClose} dirty={dirty} busy={busy} error={error}>
    <div className="tw:space-y-6 tw:min-w-0">
      <header className="tw:space-y-3">
        <h3 className="tw:mt-0 tw:text-xl tw:font-bold tw:break-words">{candidate.title}</h3>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:text-sm">
          <span className="tw:text-muted">{candidate.author || 'Autor sin identificar'}</span>
          <a className="tw:font-semibold tw:text-brand-ink tw:underline" href={candidate.source_url} target="_blank" rel="noreferrer">Abrir noticia original ↗</a>
          <span className="tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1">Procedencia guardada: {rightsLabel}</span>
        </div>
      </header>
      <nav aria-label="Pasos para preparar la noticia" className="tw:grid tw:grid-cols-3 tw:gap-2 tw:rounded-xl tw:bg-canvas tw:p-2">
        {['Procedencia', 'Adaptación', 'Borrador'].map((label, index) => <button key={label} type="button"
          className={`${ui.button} ${step === index + 1 ? 'tw:enabled:border-brand tw:enabled:bg-brand-soft tw:enabled:text-brand-ink' : ''} tw:min-w-0 tw:px-2 tw:text-center`}
          aria-current={step === index + 1 ? 'step' : undefined} disabled={busy} onClick={() => setStep(index + 1)}>
          <span className="tw:block tw:text-xs tw:text-muted">Paso {index + 1}</span>{label}
        </button>)}
      </nav>
      {notice && <p role="status" className={ui.notice}>{notice}</p>}
      {candidate.source_changed && <p className={ui.error}>La noticia original cambió. Revisa su procedencia de nuevo antes de continuar.</p>}

      {step === 1 && <section className="tw:space-y-5" aria-label="Revisar procedencia">
        <div><h4 className={ui.heading}>¿De quién es el texto?</h4><p className="tw:mt-2 tw:text-muted">Consulta el original y guarda lo que hayas podido verificar.</p></div>
        <div className="tw:grid tw:gap-3 tw:md:grid-cols-2 tw:items-start">
        <details className={`${ui.step} tw:space-y-0 tw:p-4 tw:sm:p-4`}><summary className="tw:cursor-pointer tw:font-semibold">¿Cómo compruebo la procedencia?</summary>
          <p>Revisa la firma, los créditos y las condiciones de reutilización. Una firma como «Redacción» no es suficiente por sí sola.</p>
          <p>Si no puedes confirmarlo, elige «No está claro». Adaptar con Gemini no concede permisos ni cambia la autoría. Los textos de terceros o de origen incierto no pueden aprobarse para publicar.</p>
        </details>
        <details className={`${ui.step} tw:space-y-0 tw:p-4 tw:sm:p-4`}><summary className="tw:cursor-pointer tw:font-semibold">Leer el texto original</summary>
          <p className="tw:max-h-80 tw:overflow-y-auto tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{candidate.original_text}</p>
        </details>
        </div>
        <fieldset disabled={busy} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
          <legend className="tw:mb-3 tw:font-semibold">Selecciona una opción</legend>
          <div className="tw:grid tw:gap-3 tw:md:grid-cols-3">
          {choices.map(option => <label key={option.value} className={`tw:flex tw:cursor-pointer tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:p-4 ${selectedChoice === option.value ? 'tw:border-brand tw:bg-brand-soft' : 'tw:border-stroke'}`}>
            <input className="tw:mt-1 tw:size-4 tw:shrink-0" type="radio" name="news-provenance" value={option.value} checked={selectedChoice === option.value} onChange={() => setChoice(option.value)} />
            <span><strong className="tw:block">{option.label}</strong><span className="tw:mt-1 tw:block tw:text-sm tw:text-muted">{option.help}</span></span>
          </label>)}
          </div>
        </fieldset>
        <label className={ui.label}>¿En qué te basas?
          <textarea className={`${ui.field} tw:min-h-24 tw:font-sans tw:font-normal`} rows={3} value={note} maxLength={2000} disabled={busy}
            placeholder="Ej.: Revisé los créditos y las condiciones de uso del medio." onChange={event => setNote(event.target.value)} aria-describedby="provenance-help" />
          <small id="provenance-help" className="tw:text-sm tw:font-normal tw:text-muted">Motivo obligatorio, de 5 a 2000 caracteres. Elegir una opción no guarda todavía.</small>
        </label>
        <div className={ui.actions}>
          <button type="button" className={primary} disabled={!canReview || !choices.some(option => option.value === selectedChoice)}
            onClick={() => void action(() => reviewCandidate(candidate.id, selectedChoice, note, candidate.source_hash), 'Procedencia guardada. Puedes continuar con la adaptación.', true)}>Guardar procedencia</button>
          <button type="button" className={ui.button} disabled={busy} onClick={() => setStep(2)}>Continuar a adaptación →</button>
        </div>
        <details className={`${ui.step} tw:space-y-0 tw:p-4 tw:sm:p-4`}><summary className="tw:cursor-pointer tw:font-semibold">Otras decisiones y último motivo</summary>
          <p>Para descartar o mantener en revisión, escribe el motivo en el campo anterior.</p>
          <div className={ui.actions}>{[['discard', 'Descartar noticia'], ['keep', 'Mantener en revisión']].map(([value, label]) => <button key={value} type="button" className={ui.button} disabled={!canReview}
            onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Decisión guardada.', true)}>{label}</button>)}</div>
          {candidate.editorial_note && <p className="tw:break-words">Último motivo: {CONTENT_ERRORS[candidate.editorial_note] || candidate.editorial_note}</p>}
        </details>
      </section>}

      {step === 2 && <section className="tw:space-y-5" aria-label="Adaptar noticia">
        <div><h4 className={ui.heading}>Prepara un texto más claro</h4><p className="tw:mt-2 tw:text-muted">Pide una propuesta a Gemini o continúa para escribirla tú.</p></div>
        {(requestingAdaptation || waiting) && <div role="status" aria-live="polite" className="tw:flex tw:items-start tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-brand tw:bg-brand-soft tw:p-5">
          {adaptationStatus === 'waiting_quota' && !requestingAdaptation ? <span aria-hidden="true" className="tw:text-2xl tw:font-bold tw:text-brand-ink">Ⅱ</span>
            : <span aria-hidden="true" className="tw:mt-1 tw:size-6 tw:shrink-0 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand tw:motion-reduce:animate-none" />}
          <div>
            <strong className="tw:block tw:text-lg">{requestingAdaptation ? 'Enviando solicitud…' : adaptationStatus === 'waiting_quota' ? 'Esperando cuota gratuita' : 'Adaptación solicitada · En cola'}</strong>
            <p className="tw:mt-2 tw:mb-0">{requestingAdaptation ? 'Estamos enviando tu petición. Espera la confirmación.' : adaptationStatus === 'waiting_quota' ? 'La solicitud está guardada y continuará cuando haya cuota disponible.' : 'Tu solicitud está guardada. Puede estar esperando su turno o preparando la propuesta.'}</p>
            {!requestingAdaptation && <p className="tw:mt-2 tw:mb-0 tw:text-sm">No vuelvas a solicitarla. Pulsa «Actualizar propuesta» para saber si ya está lista.</p>}
          </div>
        </div>}
        {adaptationStatus === 'failed' && !requestingAdaptation && <p role="alert" className={ui.error}>La adaptación no pudo completarse. {CONTENT_ERRORS[candidate.editorial_note || ''] || 'Puedes volver a solicitarla o preparar el texto manualmente.'}</p>}
        {proposalReady && candidate.adaptation ? <div className={ui.step}>
          <span role="status" className="tw:text-sm tw:font-semibold tw:text-brand-ink">✓ Propuesta lista para revisar</span>
          <h5 className="tw:text-lg tw:font-bold tw:break-words">{candidate.adaptation.title}</h5>
          <details><summary className="tw:cursor-pointer tw:font-semibold">Leer la propuesta completa</summary>
            <p className="tw:max-h-80 tw:overflow-y-auto tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{candidate.adaptation.body}</p>
            <p className="tw:text-sm tw:text-muted">{candidate.adaptation.changes}</p>
          </details>
          {candidate.adaptation.unsuitable && <p className={ui.error}>La propuesta contiene advertencias de Gemini. Revísala antes de usarla.</p>}
          {!draft && <button type="button" className={primary} disabled={busy} onClick={() => textEdited ? setConfirmReplace(true) : applyProposal()}>Usar propuesta y revisar borrador →</button>}
          {confirmReplace && <div className={ui.notice} role="alert"><p>Esto reemplazará el título y el texto que has editado en el paso Borrador.</p><div className={ui.actions}>
            <button type="button" className={ui.button} onClick={() => setConfirmReplace(false)}>Conservar mi texto</button>
            <button type="button" className={primary} onClick={applyProposal}>Reemplazar con la propuesta</button>
          </div></div>}
        </div> : !waiting && !requestingAdaptation && adaptationStatus !== 'failed' && <div className={ui.notice} role="status">Todavía no hay una propuesta. Puedes solicitarla o preparar el borrador manualmente.</div>}
        {!adaptationEnabled && <p className={ui.notice}>La adaptación está desactivada. Puedes preparar el texto manualmente.</p>}
        <div className={ui.actions}>
          <button type="button" className={proposalReady ? ui.button : primary} disabled={busy || !adaptationEnabled || !!draft || waiting || candidate.status === 'discarded'}
            onClick={() => void askAdaptation()}>{requestingAdaptation ? 'Enviando solicitud…' : waiting ? 'Solicitud pendiente' : proposalReady ? 'Solicitar otra adaptación' : 'Adaptar con Gemini'}</button>
          <button type="button" className={ui.button} disabled={busy} onClick={() => { setError(''); onChanged(); }}>Actualizar propuesta</button>
          <button type="button" className={ui.button} disabled={busy} onClick={() => setStep(3)}>Preparar borrador manualmente →</button>
        </div>
      </section>}

      {step === 3 && <section className="tw:space-y-5" aria-label="Preparar borrador">
        {draft ? <div className={ui.step}><h4 className={ui.heading}>El borrador ya está creado</h4>
          <p>Continúa allí para aprobar el texto, preparar el audio y publicar.</p>
          <button type="button" className={primary} disabled={busy} onClick={() => onDraft(draft.id, draft.title)}>Abrir borrador →</button>
        </div> : <>
          <div><h4 className={ui.heading}>Revisa y guarda tu borrador</h4><p className="tw:mt-2 tw:text-muted">{usedProposal ? 'Has copiado la propuesta de Gemini. Puedes corregirla antes de guardar.' : 'El formulario parte del texto original. Edítalo o vuelve a Adaptación para usar la propuesta.'}</p></div>
          {candidate.rights_status !== 'own' && <p className={ui.notice}>Puedes guardar un borrador, pero faltará confirmar la procedencia para aprobarlo y publicarlo.</p>}
          {candidate.status === 'discarded' && <p className={ui.error}>Esta noticia está descartada. Vuelve a Procedencia y elige Mantener en revisión antes de crear su borrador.</p>}
          <form className={`${ui.form} tw:[&_input]:font-sans tw:[&_input]:font-normal tw:[&_textarea]:font-sans tw:[&_textarea]:font-normal`} onSubmit={event => {
            event.preventDefault();
            void action(async () => { const saved = await createCandidateDraft(candidate.id, title, body); setCreatedDraft({ id: saved.id, title: saved.title }); }, 'Borrador guardado. Ya puedes continuar con el audio y la publicación.');
          }}>
            <label className="tw:col-span-full">Título<input required minLength={3} maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
            <label className="tw:col-span-full">Texto de la noticia<textarea required minLength={10} maxLength={4000} rows={8} value={body} disabled={busy} onChange={event => setBody(event.target.value)} />
              <small className="tw:text-sm tw:font-normal tw:text-muted">{body.length} / 4000 caracteres</small>
            </label>
            <div className="tw:col-span-full tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4">
              <span className="tw:text-sm tw:text-muted">Guardar no publica la noticia.</span>
              <button type="submit" className={primary} disabled={busy || candidate.status === 'discarded'}>Guardar como borrador</button>
            </div>
          </form>
        </>}
      </section>}
    </div>
  </Modal>;
}

