import { useEffect, useState } from 'react';
import { fetchLegalDocuments, type LegalDocuments, type LegalDocType } from '../../api/legal';
import { useAuth } from '../../auth/AuthContext';
import { LEGAL_NAMES, LEGAL_STATES, legalDate } from '../../lib/legalMeta';
import { LegalDraftForm } from './LegalDraftForm';
import { LegalVersionDetail } from './LegalVersionDetail';
import { legalStyles as s, legalStateColor } from './legalStyles';

export function LegalPage() {
  const { user } = useAuth();
  const allowed = user?.role === 'admin';
  const [type, setType] = useState<LegalDocType | ''>('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<{ key: string; data: LegalDocuments | null; error: string } | null>(null);
  const key = `${type}:${reload}`;
  const data = result?.key === key ? result.data : null;
  const error = result?.key === key ? result.error : '';
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchLegalDocuments(type || undefined).then(value => { if (!cancelled) setResult({ key, data: value, error: '' }); })
      .catch((err: unknown) => { if (!cancelled) setResult({ key, data: null, error: err instanceof Error ? err.message : 'No fue posible consultar los documentos.' }); });
    return () => { cancelled = true; };
  }, [allowed, type, reload, key]);
  if (!allowed) return <p className={s.notice}>Este apartado está disponible solo para administradores.</p>;
  const allVersions = data?.documents.flatMap(doc => doc.versions ?? []) ?? [];
  const version = allVersions.find(row => row.version_id === selected) ?? null;
  return <section aria-label="Legales y privacidad" className="tw:mx-auto tw:max-w-[1400px] tw:space-y-6">
    <header className={s.panel}><div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><p className="tw:text-xs tw:font-bold tw:uppercase tw:tracking-wider tw:text-brand-ink">Documentos de la plataforma</p><h2 className="tw:text-3xl tw:font-bold tw:tracking-tight">Legales y privacidad</h2><p className={s.muted}>Consulta los textos vigentes, revisa el histórico y prepara nuevas versiones.</p></div><button className={`${s.button} ${s.primary}`} type="button" disabled={!data?.earliest_major_effective_date || showForm || !!version} onClick={() => { setNotice(''); setShowForm(true); }}>Nueva versión</button></div>
      <div className="tw:grid tw:gap-3 tw:sm:grid-cols-3">{[['1. Crear borrador', 'Prepara el texto, los cambios y la fecha.'], ['2. Revisar y publicar', 'Confirma la versión que quedará registrada.'], ['3. Entrada en vigencia', 'Se aplica desde la fecha indicada, en horario de Santiago.']].map(([title, text]) => <div key={title} className={s.notice}><p className="tw:font-semibold tw:text-ink">{title}</p><p className="tw:mt-1">{text}</p></div>)}</div>
    </header>
    {notice && <p role="status" className={`${s.notice} tw:text-positive`}>{notice}</p>}
    <div className={`${s.panel} tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4`}><label className={`${s.label} tw:w-full tw:sm:max-w-sm`}>Documento<select className={s.field} aria-label="Filtrar documentos legales" value={type} disabled={showForm || !!version}
      onChange={event => { setType(event.target.value as LegalDocType | ''); setSelected(''); setNotice(''); }}>
      <option value="">Todos los documentos</option>{Object.entries(LEGAL_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label><button className={s.button} type="button" disabled={showForm || !!version} onClick={() => { setType(''); setSelected(''); setNotice(''); }}>Restablecer filtros</button><button className={s.button} type="button" disabled={showForm || !!version || !data && !error} onClick={() => setReload(value => value + 1)}>Actualizar documentos</button></div>
    {error ? <div role="alert" className={s.error}><p>{error}</p><button type="button" className={`${s.button} tw:mt-3`} onClick={() => setReload(value => value + 1)}>Reintentar consulta</button></div> : !data ? <p role="status" className={s.notice}>Cargando documentos legales…</p> : <>
      <p className={s.muted}>Última consulta: {legalDate(data.computed_at)} · Hora de Santiago</p>
      {!data.documents.length && <p className={s.notice}>No hay documentos para esta consulta.</p>}
      {data.documents.map(doc => <section key={doc.doc_type} className={s.panel} aria-label={LEGAL_NAMES[doc.doc_type]}>
        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-4"><div className="tw:space-y-2"><h3 className={s.heading}>{LEGAL_NAMES[doc.doc_type]}</h3><p className={s.muted}>{doc.doc_type === 'terms' ? 'Condiciones que regulan el uso de la plataforma.' : 'Información sobre el tratamiento de datos personales.'}</p></div><span className={`${s.badge} ${doc.current ? 'tw:text-positive' : 'tw:text-muted'}`}>{doc.current ? `Versión vigente: ${doc.current.semver}` : 'Sin versión vigente'}</span></div>
        {!doc.versions ? <p className={s.notice}>Actualiza la API para consultar los textos y el histórico completo.</p> : !doc.versions.length ? <p className={s.notice}>Todavía no hay versiones registradas. Crea un borrador para preparar este documento.</p> : <div className="tw:space-y-3"><h4 className="tw:font-semibold">Versiones registradas</h4><ul className="tw:list-none tw:space-y-3">{doc.versions.map(row => <li key={row.version_id} className="tw:grid tw:items-center tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4 tw:md:grid-cols-[1fr_1.3fr_1.5fr_auto]">
          <div className="tw:space-y-2"><p className="tw:font-bold">Versión {row.semver}</p><span className={`${s.badge} ${legalStateColor(row.display_state)}`}>{LEGAL_STATES[row.display_state]}</span></div>
          <div><p className="tw:text-xs tw:text-muted">Entrada en vigencia</p><p className="tw:mt-1 tw:text-sm">{legalDate(row.effective_at)}</p></div>
          <div className="tw:space-y-1"><p className="tw:text-sm">{row.requires_reacceptance ? 'Requiere nueva aceptación' : 'No requiere nueva aceptación'}</p><p className="tw:text-xs tw:text-muted">{row.published_at ? `Publicada: ${legalDate(row.published_at)}` : 'Borrador · aún sin publicar'}</p></div>
          <button type="button" className={`${s.button} ${row.status === 'draft' ? s.primary : ''}`} aria-label={`Revisar ${LEGAL_NAMES[doc.doc_type]} versión ${row.semver}`} onClick={() => { setSelected(row.version_id); setNotice(''); }}>Revisar versión</button>
        </li>)}</ul></div>}
      </section>)}
      <details className={s.panel}><summary className="tw:cursor-pointer tw:font-semibold">Sobre la aceptación en la app móvil</summary><p className={s.muted}>La solicitud de reaceptación a los usuarios queda pendiente de conectar con la app móvil. Esta consola registra y publica las versiones de los documentos.</p></details>
    </>}
    {showForm && data && <LegalDraftForm initialType={type || 'terms'} earliestMajorDate={data.earliest_major_effective_date}
      onCancel={() => setShowForm(false)} onSaved={id => { setShowForm(false); setSelected(id); setNotice('Borrador creado. Revisa la versión antes de publicarla.'); setReload(value => value + 1); }} />}
    {version && <LegalVersionDetail key={version.version_id} version={version} onClose={() => setSelected('')} onPublished={() => { setSelected(''); setNotice(`Versión ${version.semver} publicada. Su entrada en vigencia se rige por la fecha registrada.`); setReload(value => value + 1); }} />}
  </section>;
}
