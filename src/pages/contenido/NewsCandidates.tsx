import { useEffect, useState } from 'react';
import { createCandidateDraft, fetchCandidates, fetchEditorialJobs, fetchEditorialRuntime, requestAdaptation, requestCollection, reviewCandidate,
  type NewsCandidate, type EditorialJob } from '../../api/content';
import { EDITORIAL_STATES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';
import { contentStyles as ui } from './contentStyles';
import { Modal } from '../../components/Modal';

export function NewsCandidates({ onDraft }: { onDraft: (id: string, title: string) => void }) {
  const [items, setItems] = useState<NewsCandidate[]>([]);
  const [jobs, setJobs] = useState<EditorialJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runtime, setRuntime] = useState<{ worker_enabled: boolean; gemini_ready: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCandidates(page), fetchEditorialJobs(), fetchEditorialRuntime()]).then(([data, executions, config]) => {
      if (!cancelled) { setItems(data.items); setTotal(data.total); setJobs(executions.items); setRuntime(config); }
    }).catch(exception => { if (!cancelled) setError(exception.message); });
    return () => { cancelled = true; };
  }, [page, revision]);
  const current = items.find(item => item.id === selected);
  async function collect() {
    setBusy(true); setError('');
    try { await requestCollection(); setNotice('Recopilación en cola. Actualiza para ver resultados; ninguna noticia se publica automáticamente.'); setRevision(value => value + 1); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo recopilar.'); }
    finally { setBusy(false); }
  }
  return <section className={`${ui.panel} tw:space-y-5`} aria-label="Noticias recopiladas"><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-5"><div><h2 className={ui.heading}>Noticias recopiladas</h2>
    <p className={ui.description}>Hasta 20 candidatos por consulta. Todos se conservan; inicialmente se adaptan hasta 5. Revisión humana antes de publicar.</p></div>
    <div className={ui.actions}><button className={ui.button} disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1); }}>Actualizar candidatos y trabajos</button>
      <button className={`${ui.button} ${ui.primary}`} disabled={busy} onClick={() => void collect()}>Recopilar ahora</button></div></div>
    {notice && <p role="status" className={ui.notice}>{notice}</p>}{error && <p className={ui.error} role="alert">{error}</p>}
    {runtime && !runtime.worker_enabled && <p className={ui.notice}>El procesamiento automático está desactivado. Las solicitudes se conservan hasta que se active.</p>}
    {runtime && !runtime.gemini_ready && <p className={ui.notice}>La adaptación con Gemini no está disponible. Puedes revisar las noticias y preparar borradores manualmente.</p>}
    <div className={ui.scroll}><table className={ui.table}><thead><tr><th>Noticia</th><th>Estado</th><th>Procedencia</th><th>Acción</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className={selected === item.id ? 'tw:bg-brand-soft' : ''}><td className="tw:min-w-64 tw:max-w-sm"><p className="tw:font-semibold tw:break-words">{item.title}</p><p className="tw:mt-2 tw:text-sm tw:text-muted">{item.source_date ? ticketDate(item.source_date) : 'Fecha no disponible'}</p></td>
        <td>{EDITORIAL_STATES[item.status] || item.status}{item.source_changed && <p>El original cambió: revisar</p>}</td>
        <td>{item.rights_status === 'own' ? 'Contenido original del medio confirmado' : item.rights_status === 'third_party' ? 'Material de terceros' : item.rights_status === 'uncertain' ? 'Origen incierto' : 'Sin revisar'}</td>
        <td><button className={ui.button} aria-expanded={selected === item.id} onClick={() => { if (selected && selected !== item.id && !window.confirm('Al cambiar de noticia perderás los cambios editoriales que no hayas guardado. ¿Continuar?')) return; setSelected(item.id); }}>Revisar</button></td></tr>)}
        {!items.length && <tr><td colSpan={4}>No hay candidatos en esta página. Una consulta fallida se muestra en los trabajos, no como cero noticias.</td></tr>}</tbody></table></div>
    <div className="tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><span>{total} candidatos · página {page}</span><div className={ui.actions}>
      <button className={ui.button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <button className={ui.button} disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    {current && <CandidateReview key={current.id} candidate={current} onClose={() => setSelected('')} onChanged={() => setRevision(value => value + 1)} onDraft={(id, title) => { setSelected(''); onDraft(id, title); }} />}
    <details className={ui.step}><summary className="tw:cursor-pointer tw:font-semibold">Trabajos y resultados recientes</summary><div className={`${ui.scroll} tw:mt-5`}><table className={ui.table}><thead><tr><th>Proceso</th><th>Estado</th><th>Resultado</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.id}><td>{job.kind === 'collect' ? 'Recopilación' : job.kind === 'adapt' ? 'Adaptación' : 'Audio'} · {ticketDate(job.created_at)}</td>
        <td>{EDITORIAL_STATES[job.status] || job.status}</td><td>{job.error ? CONTENT_ERRORS[job.error] || 'El trabajo requiere revisión' : job.kind === 'collect' && job.result ? `${job.result.candidates ?? 0} nuevos · ${job.result.duplicates ?? 0} existentes · ${job.result.changed ?? 0} modificados` : job.status === 'done' ? (job.kind === 'adapt' ? 'Adaptación terminada. Abre Revisar en la noticia para ver la propuesta.' : 'Proceso terminado. Revisa el contenido correspondiente.') : 'Pendiente de procesamiento. Pulsa Actualizar candidatos y trabajos para consultar el avance.'}</td></tr>)}</tbody></table></div></details>
  </section>;
}

function CandidateReview({ candidate, onChanged, onDraft, onClose }: { candidate: NewsCandidate; onChanged: () => void; onDraft: (id: string, title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(candidate.adaptation?.title || candidate.title.slice(0, 160));
  const [body, setBody] = useState(candidate.adaptation?.body || candidate.original_text.slice(0, 4000));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createdDraft, setCreatedDraft] = useState<{ id: string; title: string } | null>(null);
  const dirty = !!note.trim() || (!candidate.item_id && !createdDraft && (
    title !== (candidate.adaptation?.title || candidate.title.slice(0, 160))
    || body !== (candidate.adaptation?.body || candidate.original_text.slice(0, 4000))));
  const rightsLabel = candidate.rights_status === 'own' ? 'Contenido original del medio confirmado' : candidate.rights_status === 'third_party' ? 'Material de terceros' : candidate.rights_status === 'uncertain' ? 'Origen incierto' : 'Sin revisar';
  async function action(task: () => Promise<unknown>, message: string, reviewed = false) {
    setBusy(true); setError('');
    try { await task(); if (reviewed) setNote(''); onChanged(); setNotice(message); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Revisar y preparar noticia" onClose={onClose} dirty={dirty} busy={busy}>
    <div className="tw:space-y-6 tw:p-2"><h3 className="tw:max-w-3xl tw:text-2xl tw:font-bold tw:break-words">{candidate.title}</h3>
    <p>{candidate.author || 'Autor no identificado'} · <a className="tw:font-semibold tw:text-brand-ink tw:underline" href={candidate.source_url} target="_blank" rel="noreferrer">Abrir noticia original</a></p>
    <p className={ui.description}>Revisa la procedencia, solicita una adaptación y guarda un borrador. Ninguno de estos pasos publica la noticia.</p>
    <section className={ui.step}><h4 className={ui.heading}>1. Revisar la procedencia</h4>
    <p className={ui.notice} role="status">Procedencia guardada: <strong>{rightsLabel}</strong> · Estado: {EDITORIAL_STATES[candidate.status] || candidate.status}</p>
    <p>Una firma como «Redacción» no confirma autoría ni permisos. Revisa los créditos y las condiciones de reutilización en la noticia original. Si no está claro, elige «Origen incierto».</p>
    <details><summary className="tw:cursor-pointer tw:font-semibold">Consultar texto original recopilado</summary><p className="tw:mt-4 tw:max-h-96 tw:overflow-y-auto tw:rounded-xl tw:bg-canvas tw:p-5 tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{candidate.original_text}</p></details>
    <label className={ui.label}>Motivo de la decisión sobre la procedencia<input className={ui.field} value={note} minLength={5} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={busy} placeholder="Ej.: No se han confirmado los permisos de reutilización" /><small className="tw:text-sm tw:font-normal tw:text-muted">Entre 5 y 2000 caracteres. Escribe el motivo y pulsa una opción para guardarlo.</small></label>
    <div className={ui.actions}>{[['own', 'Confirmar contenido original del medio'], ['third_party', 'Marcar material de terceros'], ['uncertain', 'Origen incierto']].map(([value, label]) =>
      <button key={value} className={`${ui.button} ${candidate.rights_status === value ? `${ui.primary} tw:disabled:opacity-100` : ''}`} aria-pressed={candidate.rights_status === value} disabled={busy || note.trim().length < 5} onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Procedencia y motivo guardados.', true)}>{candidate.rights_status === value ? '✓ ' : ''}{label}</button>)}
    </div><p className={ui.description}>Confirmar el origen del medio no concede permisos de reutilización. Gemini tampoco cambia la propiedad del texto.</p>
    <div className={ui.actions}>{[['discard', 'Descartar noticia'], ['keep', 'Mantener para revisión']].map(([value, label]) => <button key={value} className={ui.button} disabled={busy || note.trim().length < 5} onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Decisión guardada.', true)}>{label}</button>)}</div>
    {candidate.editorial_note && <p>Último motivo guardado: {CONTENT_ERRORS[candidate.editorial_note] || candidate.editorial_note}</p>}
    </section>
    <section className={ui.step}><h4 className={ui.heading}>2. Adaptar con Gemini</h4>
    <p>La adaptación se procesa en segundo plano. Después de solicitarla, pulsa «Actualizar candidatos y trabajos» arriba para ver el resultado.</p>
    <button className={`${ui.button} ${ui.primary}`} disabled={busy || !!candidate.item_id || ['queued', 'waiting_quota', 'discarded'].includes(candidate.status)} onClick={() => void action(() => requestAdaptation(candidate.id), 'Adaptación en cola. Pulsa Actualizar candidatos y trabajos para ver el avance.')}>{candidate.status === 'queued' ? 'Adaptación en cola' : candidate.status === 'waiting_quota' ? 'Esperando cuota gratuita' : 'Adaptar con Gemini'}</button>
    {candidate.adaptation && <details open className="tw:space-y-4 tw:rounded-xl tw:border tw:border-solid tw:border-brand tw:bg-canvas tw:p-5"><summary className="tw:cursor-pointer tw:font-semibold">Propuesta de Gemini disponible</summary><h5 className="tw:text-lg tw:font-bold">{candidate.adaptation.title}</h5><p>{candidate.adaptation.classification}</p><p>{candidate.adaptation.changes}</p>
      <p className="tw:max-w-3xl tw:leading-8 tw:whitespace-pre-wrap tw:break-words">{candidate.adaptation.body}</p>{candidate.adaptation.unsuitable && <p className={ui.error}>Gemini señala posibles motivos de descarte. Revisa antes de continuar.</p>}
      <button className={ui.button} disabled={busy} onClick={() => { setTitle(candidate.adaptation!.title); setBody(candidate.adaptation!.body); setNotice('Propuesta copiada al paso 3. Revisa el título y el texto y pulsa Guardar como borrador. Todavía no se ha guardado ni publicado.'); }}>Usar esta propuesta en el formulario</button></details>}
    </section>
    <section className={ui.step}><h4 className={ui.heading}>3. Revisar el texto y guardar un borrador</h4><p>El formulario puede contener el texto original. Para copiar la adaptación, pulsa «Usar esta propuesta en el formulario» en el paso anterior. Revisa ambos campos antes de guardar.</p>
    {!candidate.item_id ? <form className={ui.form} onSubmit={event => { event.preventDefault(); void action(async () => { const draft = await createCandidateDraft(candidate.id, title, body); setCreatedDraft({ id: draft.id, title: draft.title }); }, 'Borrador creado. Pulsa Ir al borrador para continuar con aprobación, audio y publicación.'); }}>
      <label>Título editorial<input required minLength={3} maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
      <label className="tw:col-span-full">Texto editorial (máximo 4000 caracteres)<textarea required minLength={10} maxLength={4000} rows={8} value={body} disabled={busy} onChange={event => setBody(event.target.value)} /></label>
      <p className={`${ui.description} tw:col-span-full`}>Puedes adaptar manualmente aunque no haya cuota. Crear borrador no publica ni confirma derechos. El texto original se conserva.</p>
      <button className={`${ui.button} ${ui.primary}`} disabled={busy || candidate.status === 'discarded'}>Guardar como borrador</button>
    </form> : <p>Ya tiene un borrador: revísalo en el listado de contenido.</p>}
    </section>
    {createdDraft && <button className={`${ui.button} ${ui.primary}`} onClick={() => onDraft(createdDraft.id, createdDraft.title)}>Ir al borrador</button>}
    {error && <p role="alert" className={ui.error}>{error}</p>}{notice && <p role="status" className={ui.notice}>{notice}</p>}
  </div></Modal>;
}
