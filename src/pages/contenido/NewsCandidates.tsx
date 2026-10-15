import { useEffect, useState } from 'react';
import { createCandidateDraft, fetchCandidates, fetchEditorialJobs, fetchEditorialRuntime, requestAdaptation, requestCollection, reviewCandidate,
  type NewsCandidate, type EditorialJob } from '../../api/content';
import { EDITORIAL_STATES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';

export function NewsCandidates({ onDraft }: { onDraft: () => void }) {
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
        <td>{item.rights_status === 'own' ? 'Texto propio confirmado' : item.rights_status === 'third_party' ? 'Material de terceros' : 'Origen por verificar'}</td>
        <td><button className="theme-toggle" onClick={() => { if (selected && selected !== item.id && !window.confirm('Al cambiar de noticia perderás los cambios editoriales que no hayas guardado. ¿Continuar?')) return; setSelected(item.id); }}>Revisar</button></td></tr>)}
        {!items.length && <tr><td colSpan={4}>No hay candidatos en esta página. Una consulta fallida se muestra en los trabajos, no como cero noticias.</td></tr>}</tbody></table></div>
    <div className="audit-pagination"><span>{total} candidatos · página {page}</span><div className="audit-actions">
      <button className="theme-toggle" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <button className="theme-toggle" disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    {current && <CandidateReview key={current.id} candidate={current} onChanged={() => setRevision(value => value + 1)} onDraft={onDraft} />}
    <details><summary>Trabajos y resultados recientes</summary><table className="data"><thead><tr><th>Proceso</th><th>Estado</th><th>Resultado</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.id}><td>{job.kind === 'collect' ? 'Recopilación' : job.kind === 'adapt' ? 'Adaptación' : 'Audio'} · {ticketDate(job.created_at)}</td>
        <td>{EDITORIAL_STATES[job.status] || job.status}</td><td>{job.result ? `${job.result.candidates ?? 0} nuevos · ${job.result.duplicates ?? 0} existentes · ${job.result.changed ?? 0} modificados` : (job.error ? CONTENT_ERRORS[job.error] || 'El trabajo requiere revisión' : 'Sin resultado todavía')}</td></tr>)}</tbody></table></details>
  </section>;
}

function CandidateReview({ candidate, onChanged, onDraft }: { candidate: NewsCandidate; onChanged: () => void; onDraft: () => void }) {
  const [title, setTitle] = useState(candidate.adaptation?.title || candidate.title.slice(0, 160));
  const [body, setBody] = useState(candidate.adaptation?.body || candidate.original_text.slice(0, 4000));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function action(task: () => Promise<unknown>, message: string) {
    setBusy(true); setError('');
    try { await task(); onChanged(); setNotice(message); }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo completar.'); }
    finally { setBusy(false); }
  }
  return <div className="content-detail"><h3>{candidate.title}</h3>
    <p>{candidate.author || 'Autor no identificado'} · <a href={candidate.source_url} target="_blank" rel="noreferrer">Abrir noticia original</a></p>
    <p className="card-sub">Una firma no prueba propiedad. Verifica texto propio del medio; se excluyen agencias, terceros e imágenes externas.</p>
    <details open><summary>Texto original recopilado</summary><p style={{ whiteSpace: 'pre-wrap' }}>{candidate.original_text}</p></details>
    {candidate.adaptation && <details open><summary>Propuesta de Gemini</summary><p>{candidate.adaptation.classification}</p><p>{candidate.adaptation.changes}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{candidate.adaptation.body}</p>{candidate.adaptation.unsuitable && <p className="audit-error">Gemini señala posibles motivos de descarte. Revisa antes de continuar.</p>}
      <button className="theme-toggle" disabled={busy} onClick={() => { setTitle(candidate.adaptation!.title); setBody(candidate.adaptation!.body); }}>Usar esta propuesta en el formulario</button></details>}
    {candidate.editorial_note && <p>Observaciones: {CONTENT_ERRORS[candidate.editorial_note] || candidate.editorial_note}</p>}
    <label className="settings-field">Motivo de revisión<input value={note} minLength={5} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={busy} /></label>
    <div className="audit-actions">{[['own', 'Confirmar texto propio'], ['third_party', 'Marcar material de terceros'], ['uncertain', 'Origen incierto'], ['discard', 'Descartar'], ['keep', 'Mantener para revisión']].map(([value, label]) =>
      <button key={value} className="theme-toggle" disabled={busy || note.trim().length < 5} onClick={() => void action(() => reviewCandidate(candidate.id, value, note, candidate.source_hash), 'Revisión guardada.')}>{label}</button>)}
      <button className="action-button" disabled={busy || !!candidate.item_id || ['queued', 'waiting_quota', 'discarded'].includes(candidate.status)} onClick={() => void action(() => requestAdaptation(candidate.id), 'Adaptación en cola; el candidato se conserva.')}>Adaptar con Gemini</button></div>
    {!candidate.item_id ? <form className="ticket-form" onSubmit={event => { event.preventDefault(); void action(async () => { await createCandidateDraft(candidate.id, title, body); onDraft(); }, 'Borrador creado para revisión y aprobación.'); }}>
      <label>Título editorial<input required minLength={3} maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} /></label>
      <label className="wide">Texto editorial (máximo 4000 caracteres)<textarea required minLength={10} maxLength={4000} rows={8} value={body} disabled={busy} onChange={event => setBody(event.target.value)} /></label>
      <p className="card-sub wide">Puedes adaptar manualmente aunque no haya cuota. Crear borrador no publica ni confirma derechos. El texto original se conserva.</p>
      <button className="action-button" disabled={busy || candidate.status === 'discarded'}>Guardar como borrador</button>
    </form> : <p>Ya tiene un borrador: revísalo en el listado de contenido.</p>}
    {error && <p role="alert" className="audit-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </div>;
}
