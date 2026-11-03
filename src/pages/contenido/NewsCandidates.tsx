import { useEffect, useState } from 'react';
import { createCandidateDraft, fetchCandidates, fetchEditorialJobs, fetchEditorialRuntime, requestAdaptation, requestCollection, reviewCandidate,
  type NewsCandidate, type EditorialJob } from '../../api/content';
import { EDITORIAL_STATES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';

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
  return <section className="card" aria-label="Noticias recopiladas"><div className="card-head"><div><h2 className="card-title">Noticias recopiladas</h2>
    <p className="card-sub">Hasta 20 candidatos por consulta. Todos se conservan; inicialmente se adaptan hasta 5. Revisión humana antes de publicar.</p></div>
    <div className="audit-actions"><button className="theme-toggle" disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1); }}>Actualizar candidatos y trabajos</button>
      <button className="action-button" disabled={busy} onClick={() => void collect()}>Recopilar ahora</button></div></div>
    {notice && <p role="status">{notice}</p>}{error && <p className="audit-error" role="alert">{error}</p>}
    {runtime && !runtime.worker_enabled && <p className="card-sub">El procesamiento automático está desactivado en el servidor. Las solicitudes quedan guardadas, pendientes de activación.</p>}
    {runtime && !runtime.gemini_ready && <p className="card-sub">Gemini requiere configurar la clave y confirmar el proyecto gratuito en el servidor. Puedes revisar candidatos y preparar borradores manualmente.</p>}
    <div className="audit-table-scroll"><table className="data"><thead><tr><th>Noticia</th><th>Estado</th><th>Procedencia</th><th>Acción</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id}><td>{item.title}<small className="card-sub"> · {item.source_date ? ticketDate(item.source_date) : 'Fecha no disponible'}</small></td>
        <td>{EDITORIAL_STATES[item.status] || item.status}{item.source_changed && <p>El original cambió: revisar</p>}</td>
        <td>{item.rights_status === 'own' ? 'Contenido original del medio confirmado' : item.rights_status === 'third_party' ? 'Material de terceros' : item.rights_status === 'uncertain' ? 'Origen incierto' : 'Sin revisar'}</td>
        <td><button className="theme-toggle" onClick={() => { if (selected && selected !== item.id && !window.confirm('Al cambiar de noticia perderás los cambios editoriales que no hayas guardado. ¿Continuar?')) return; setSelected(item.id); }}>Revisar</button></td></tr>)}
        {!items.length && <tr><td colSpan={4}>No hay candidatos en esta página. Una consulta fallida se muestra en los trabajos, no como cero noticias.</td></tr>}</tbody></table></div>
    <div className="audit-pagination"><span>{total} candidatos · página {page}</span><div className="audit-actions">
      <button className="theme-toggle" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <button className="theme-toggle" disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    {current && <CandidateReview key={current.id} candidate={current} onChanged={() => setRevision(value => value + 1)} onDraft={onDraft} />}
    <details><summary>Trabajos y resultados recientes</summary><table className="data"><thead><tr><th>Proceso</th><th>Estado</th><th>Resultado</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.id}><td>{job.kind === 'collect' ? 'Recopilación' : job.kind === 'adapt' ? 'Adaptación' : 'Audio'} · {ticketDate(job.created_at)}</td>
        <td>{EDITORIAL_STATES[job.status] || job.status}</td><td>{job.error ? CONTENT_ERRORS[job.error] || 'El trabajo requiere revisión' : job.kind === 'collect' && job.result ? `${job.result.candidates ?? 0} nuevos · ${job.result.duplicates ?? 0} existentes · ${job.result.changed ?? 0} modificados` : job.status === 'done' ? (job.kind === 'adapt' ? 'Adaptación terminada. Abre Revisar en la noticia para ver la propuesta.' : 'Proceso terminado. Revisa el contenido correspondiente.') : 'Pendiente de procesamiento. Pulsa Actualizar candidatos y trabajos para consultar el avance.'}</td></tr>)}</tbody></table></details>
  </section>;
}

function CandidateReview({ candidate, onChanged, onDraft }: { candidate: NewsCandidate; onChanged: () => void; onDraft: (id: string, title: string) => void }) {
  const [title, setTitle] = useState(candidate.adaptation?.title || candidate.title.slice(0, 160));
  const [body, setBody] = useState(candidate.adaptation?.body || candidate.original_text.slice(0, 4000));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createdDraft, setCreatedDraft] = useState<{ id: string; title: string } | null>(null);
  const rightsLabel = candidate.rights_status === 'own' ? 'Contenido original del medio confirmado' : candidate.rights_status === 'third_party' ? 'Material de terceros' : candidate.rights_status === 'uncertain' ? 'Origen incierto' : 'Sin revisar';
  async function action(task: () => Promise<unknown>, message: string) {
    setBusy(true); setError('');
    try { await task(); onChanged(); setNotice(message); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar.'); }
    finally { setBusy(false); }
  }
  return <div className="content-detail"><h3>{candidate.title}</h3>
    <p>{candidate.author || 'Autor no identificado'} · <a href={candidate.source_url} target="_blank" rel="noreferrer">Abrir noticia original</a></p>
    <p className="card-sub">Revisa la procedencia, solicita una adaptación y guarda un borrador. Ninguno de estos pasos publica la noticia.</p>
    <section className="candidate-step"><h4>1. Revisar la procedencia</h4>
    <p className="candidate-saved" role="status">Procedencia guardada: <strong>{rightsLabel}</strong> · Estado: {EDITORIAL_STATES[candidate.status] || candidate.status}</p>
    <p>Una firma como «Redacción» no confirma autoría ni permisos. Revisa los créditos y las condiciones de reutilización en la noticia original. Si no está claro, elige «Origen incierto».</p>
    <details><summary>Consultar texto original recopilado</summary><p className="candidate-original">{candidate.original_text}</p></details>
    <label className="settings-field">Motivo de la decisión sobre la procedencia<input value={note} minLength={5} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={busy} placeholder="Ej.: No se han confirmado los permisos de reutilización" /><small>Entre 5 y 2000 caracteres. Escribe el motivo y pulsa una opción para guardarlo.</small></label>
    <div className="audit-actions">{[['own', 'Confirmar contenido original del medio'], ['third_party', 'Marcar material de terceros'], ['uncertain', 'Origen incierto']].map(([value, label]) =>
      <button key={value} className="theme-toggle candidate-choice" aria-pressed={candidate.rights_status === value} disabled={busy || note.trim().length < 5} onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Procedencia y motivo guardados.')}>{candidate.rights_status === value ? '✓ ' : ''}{label}</button>)}
    </div><p className="card-sub">Confirmar el origen del medio no concede permisos de reutilización. Gemini tampoco cambia la propiedad del texto.</p>
    <div className="audit-actions">{[['discard', 'Descartar noticia'], ['keep', 'Mantener para revisión']].map(([value, label]) => <button key={value} className="theme-toggle" disabled={busy || note.trim().length < 5} onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Decisión guardada.')}>{label}</button>)}</div>
    {candidate.editorial_note && <p>Último motivo guardado: {CONTENT_ERRORS[candidate.editorial_note] || candidate.editorial_note}</p>}
    </section>
    <section className="candidate-step"><h4>2. Adaptar con Gemini</h4>
    <p>La adaptación se procesa en segundo plano. Después de solicitarla, pulsa «Actualizar candidatos y trabajos» arriba para ver el resultado.</p>
    <button className="action-button" disabled={busy || !!candidate.item_id || ['queued', 'waiting_quota', 'discarded'].includes(candidate.status)} onClick={() => void action(() => requestAdaptation(candidate.id), 'Adaptación en cola. Pulsa Actualizar candidatos y trabajos para ver el avance.')}>{candidate.status === 'queued' ? 'Adaptación en cola' : candidate.status === 'waiting_quota' ? 'Esperando cuota gratuita' : 'Adaptar con Gemini'}</button>
    {candidate.adaptation && <details open className="candidate-proposal"><summary>Propuesta de Gemini disponible</summary><h5>{candidate.adaptation.title}</h5><p>{candidate.adaptation.classification}</p><p>{candidate.adaptation.changes}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{candidate.adaptation.body}</p>{candidate.adaptation.unsuitable && <p className="audit-error">Gemini señala posibles motivos de descarte. Revisa antes de continuar.</p>}
      <button className="theme-toggle" disabled={busy} onClick={() => { setTitle(candidate.adaptation!.title); setBody(candidate.adaptation!.body); setNotice('Propuesta copiada al paso 3. Revisa el título y el texto y pulsa Guardar como borrador. Todavía no se ha guardado ni publicado.'); }}>Usar esta propuesta en el formulario</button></details>}
    </section>
    <section className="candidate-step"><h4>3. Revisar el texto y guardar un borrador</h4><p>El formulario puede contener el texto original. Para copiar la adaptación, pulsa «Usar esta propuesta en el formulario» en el paso anterior. Revisa ambos campos antes de guardar.</p>
    {!candidate.item_id ? <form className="ticket-form" onSubmit={event => { event.preventDefault(); void action(async () => { const draft = await createCandidateDraft(candidate.id, title, body); setCreatedDraft({ id: draft.id, title: draft.title }); }, 'Borrador creado. Pulsa Ir al borrador para continuar con aprobación, audio y publicación.'); }}>
      <label>Título editorial<input required minLength={3} maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
      <label className="wide">Texto editorial (máximo 4000 caracteres)<textarea required minLength={10} maxLength={4000} rows={8} value={body} disabled={busy} onChange={event => setBody(event.target.value)} /></label>
      <p className="card-sub wide">Puedes adaptar manualmente aunque no haya cuota. Crear borrador no publica ni confirma derechos. El texto original se conserva.</p>
      <button className="action-button" disabled={busy || candidate.status === 'discarded'}>Guardar como borrador</button>
    </form> : <p>Ya tiene un borrador: revísalo en el listado de contenido.</p>}
    </section>
    {createdDraft && <button className="action-button" onClick={() => onDraft(createdDraft.id, createdDraft.title)}>Ir al borrador</button>}
    {error && <p role="alert" className="audit-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </div>;
}
