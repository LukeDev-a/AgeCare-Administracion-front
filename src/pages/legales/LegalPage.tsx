import { useEffect, useState } from 'react';
import { fetchLegalDocuments, publishLegalVersion, type LegalDocuments, type LegalDocType } from '../../api/legal';
import { useAuth } from '../../auth/AuthContext';
import { LEGAL_NAMES, LEGAL_STATES, legalDate } from '../../lib/legalMeta';
import { LegalDraftForm } from './LegalDraftForm';

export function LegalPage() {
  const { user } = useAuth();
  const allowed = user?.role === 'admin';
  const [type, setType] = useState<LegalDocType | ''>('');
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicationError, setPublicationError] = useState('');
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
  if (!allowed) return <p>Este apartado está disponible solo para administradores.</p>;
  const allVersions = data?.documents.flatMap(doc => doc.versions ?? []) ?? [];
  const version = allVersions.find(row => row.version_id === selected) ?? null;
  async function publish() {
    if (!version || busy || user?.role !== 'admin') return;
    setBusy(true); setPublicationError('');
    try { await publishLegalVersion(version.version_id); setReload(value => value + 1); }
    catch (err) { setPublicationError(err instanceof Error ? err.message : 'No fue posible publicar.'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="filter-row"><label>Documento <select aria-label="Filtrar documentos legales" value={type} disabled={busy || showForm}
      onChange={event => { setType(event.target.value as LegalDocType | ''); setSelected(''); setPublicationError(''); }}>
      <option value="">Todos los documentos</option>{Object.entries(LEGAL_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
      <button className="action-button" type="button" disabled={!data?.earliest_major_effective_date || showForm || busy} onClick={() => setShowForm(true)}>Nueva versión</button>
      <button className="action-button" type="button" disabled={busy || showForm} onClick={() => setReload(value => value + 1)}>Actualizar vista</button>
    </div>
    <p className="mini-note">Publicar conserva el texto y programa su entrada en vigencia; no reemplaza inmediatamente la versión vigente. Fechas y horas de Santiago.</p>
    <p className="mini-note">La solicitud de reaceptación a los usuarios queda pendiente de conectar con la app móvil.</p>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Cargando documentos legales...</p>}
    {showForm && data && <LegalDraftForm initialType={type || 'terms'} earliestMajorDate={data.earliest_major_effective_date}
      onCancel={() => setShowForm(false)} onSaved={id => { setShowForm(false); setSelected(id); setPublicationError(''); setReload(value => value + 1); }} />}
    {data && <>
      <p className="mini-note">Consultado: {legalDate(data.computed_at)}</p>
      {data.documents.map(doc => <section key={doc.doc_type} className="card">
        <h2 className="card-title">{LEGAL_NAMES[doc.doc_type]}</h2>
        <p>{doc.current ? `Versión vigente: ${doc.current.semver}` : 'Sin versión vigente'}</p>
        {!doc.versions ? <p>Actualiza la API para consultar los textos y el histórico completo.</p> : doc.versions.length === 0 ? <p>No hay versiones registradas.</p> :
          <div style={{ overflowX: 'auto' }}><table className="data"><thead><tr><th>Versión</th><th>Situación</th><th>Publicación</th><th>Entrada en vigencia</th><th>Reaceptación</th></tr></thead>
            <tbody>{doc.versions.map(row => <tr key={row.version_id}>
              <td><button type="button" disabled={busy} className="action-button" onClick={() => { setSelected(row.version_id); setPublicationError(''); }}>{row.semver}</button></td>
              <td>{LEGAL_STATES[row.display_state]}</td><td>{legalDate(row.published_at)}</td><td>{legalDate(row.effective_at)}</td><td>{row.requires_reacceptance ? 'Sí' : 'No'}</td>
            </tr>)}</tbody></table></div>}
      </section>)}
    </>}
    {version && <section className="card">
      <h2 className="card-title">{LEGAL_NAMES[version.doc_type]} · {version.semver}</h2>
      <p>{LEGAL_STATES[version.display_state]} · Entrada en vigencia: {legalDate(version.effective_at)}</p>
      <p className="mini-note">Creada por {version.created_by_name || 'Responsable no registrado'} · {legalDate(version.created_at)}</p>
      <h3>Resumen de cambios</h3><p style={{ whiteSpace: 'pre-wrap' }}>{version.changelog}</p>
      <h3>Texto del documento (Markdown)</h3><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{version.content_md}</div>
      <p>{version.requires_reacceptance ? 'Esta versión requiere aceptación de los usuarios cuando entre en vigencia.' : 'Esta versión no exige reaceptación por cambio mayor.'}</p>
      {version.status === 'draft' && <><p className="mini-note">Revisa el texto y la fecha antes de publicar. Una versión publicada se conserva sin editar para mantener el histórico.</p>
        <button className="action-button" type="button" disabled={busy || showForm} onClick={() => void publish()}>{busy ? 'Publicando...' : `Publicar versión ${version.semver}`}</button></>}
      {publicationError && <p role="alert">{publicationError}</p>}
    </section>}
  </>;
}
