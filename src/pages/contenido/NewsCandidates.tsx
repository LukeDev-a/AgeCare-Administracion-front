import { useEffect, useState } from 'react';
import { fetchCandidates, fetchEditorialJobs, fetchEditorialRuntime, requestCollection,
  type NewsCandidate, type EditorialJob } from '../../api/content';
import { EDITORIAL_STATES, CONTENT_ERRORS } from '../../lib/contentMeta';
import { ticketDate } from '../../lib/format';
import { contentStyles as ui } from './contentStyles';
import { CandidateReview } from './CandidateReview';
import { ImportNewsModal } from './ImportNewsModal';

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
  const [showImport, setShowImport] = useState(false);
  const [runtime, setRuntime] = useState<{ worker_enabled: boolean; gemini_ready: boolean; collection_enabled?: boolean; adaptation_enabled?: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false, inFlight = false;
    async function refreshRuntime() {
      if (inFlight) return;
      inFlight = true;
      try { const config = await fetchEditorialRuntime(); if (!cancelled) setRuntime(config); }
      catch { if (!cancelled) setError('No se pudo consultar la disponibilidad de las funciones. Actualiza antes de continuar.'); }
      finally { inFlight = false; }
    }
    const timer = window.setInterval(() => void refreshRuntime(), 60_000);
    window.addEventListener('focus', refreshRuntime);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refreshRuntime); };
  }, []);
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
    <p className={ui.description}>Elige una noticia para revisar su origen y preparar un borrador.</p></div>
    <div className={ui.actions}><button className={ui.button} disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1); }}>Actualizar candidatos y trabajos</button>
      <button className={`${ui.button} ${ui.primary}`} disabled={busy || runtime?.collection_enabled === false} onClick={() => void collect()}>Recopilar ahora</button>
      <button className={ui.button} disabled={busy || runtime?.collection_enabled === false} onClick={() => setShowImport(true)}>Importar archivo JSON</button></div></div>
    {showImport && <ImportNewsModal onClose={() => setShowImport(false)} onImported={result => {
      setShowImport(false); setSelected(''); setPage(1); setError('');
      setNotice(`Importación completada: ${result.candidates} nuevas · ${result.duplicates} existentes (${result.changed} con cambios). Revisa la procedencia antes de continuar. No se ha publicado ninguna noticia.`);
      setRevision(value => value + 1);
    }} />}
    {notice && <p role="status" className={ui.notice}>{notice}</p>}{error && <p className={ui.error} role="alert">{error}</p>}
    {runtime && !runtime.worker_enabled && <p className={ui.notice}>El procesamiento automático está desactivado. Las solicitudes se conservan hasta que se active.</p>}
    {runtime?.collection_enabled === false && <p className={ui.notice}>La recopilación de noticias está desactivada en Configuración. Puedes revisar las noticias que ya están guardadas.</p>}
    {runtime?.adaptation_enabled === false && <p className={ui.notice}>Las nuevas adaptaciones con Gemini están desactivadas en Configuración. La edición manual sigue disponible.</p>}
    {runtime && !runtime.gemini_ready && <p className={ui.notice}>La adaptación con Gemini no está disponible. Puedes revisar las noticias y preparar borradores manualmente.</p>}
    <div className={ui.scroll}><table className={ui.table}><thead><tr><th>Noticia</th><th>Estado</th><th>Procedencia</th><th>Acción</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className={selected === item.id ? 'tw:bg-brand-soft' : ''}><td className="tw:min-w-64 tw:max-w-sm"><p className="tw:font-semibold tw:break-words">{item.title}</p><p className="tw:mt-2 tw:text-sm tw:text-muted">{item.source_date ? ticketDate(item.source_date) : 'Fecha no disponible'}</p></td>
        <td>{EDITORIAL_STATES[item.status] || item.status}{item.source_changed && <p>El original cambió: revisar</p>}</td>
        <td>{item.rights_status === 'own' ? 'Contenido original del medio confirmado' : item.rights_status === 'third_party' ? 'Material de terceros' : item.rights_status === 'uncertain' ? 'Origen incierto' : 'Sin revisar'}</td>
        <td><button className={ui.button} aria-expanded={selected === item.id} onClick={() => { setSelected(item.id); }}>Revisar</button></td></tr>)}
        {!items.length && <tr><td colSpan={4}>No hay candidatos en esta página. Una consulta fallida se muestra en los trabajos, no como cero noticias.</td></tr>}</tbody></table></div>
    <div className="tw:my-5 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><span>{total} candidatos · página {page}</span><div className={ui.actions}>
      <button className={ui.button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <button className={ui.button} disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Siguiente</button></div></div>
    {current && <CandidateReview key={current.id} candidate={current} adaptationEnabled={runtime?.adaptation_enabled !== false} onClose={() => setSelected('')} onChanged={() => setRevision(value => value + 1)} onDraft={(id, title) => { setSelected(''); onDraft(id, title); }} />}
    <details className={ui.step}><summary className="tw:cursor-pointer tw:font-semibold">Trabajos y resultados recientes</summary><div className={`${ui.scroll} tw:mt-5`}><table className={ui.table}><thead><tr><th>Proceso</th><th>Estado</th><th>Resultado</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.id}><td>{job.kind === 'collect' ? 'Recopilación' : job.kind === 'adapt' ? 'Adaptación' : 'Audio'} · {ticketDate(job.created_at)}</td>
        <td>{EDITORIAL_STATES[job.status] || job.status}</td><td>{job.kind === 'collect' && job.error === 'PROVIDER_CONFIG_ERROR' ? 'La fuente de noticias rechazó el acceso automático. Puedes importar su archivo JSON; no es un error de Gemini.' : job.error ? CONTENT_ERRORS[job.error] || 'El trabajo requiere revisión' : job.kind === 'collect' && job.result ? `${job.result.candidates ?? 0} nuevos · ${job.result.duplicates ?? 0} existentes · ${job.result.changed ?? 0} modificados` : job.status === 'done' ? (job.kind === 'adapt' ? 'Adaptación terminada. Abre Revisar en la noticia para ver la propuesta.' : 'Proceso terminado. Revisa el contenido correspondiente.') : 'Pendiente de procesamiento. Pulsa Actualizar candidatos y trabajos para consultar el avance.'}</td></tr>)}</tbody></table></div></details>
  </section>;
}
