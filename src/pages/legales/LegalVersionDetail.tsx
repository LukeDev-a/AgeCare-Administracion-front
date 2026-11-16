import { useState } from 'react';
import { publishLegalVersion, type LegalVersion } from '../../api/legal';
import { LEGAL_NAMES, LEGAL_STATES, legalDate } from '../../lib/legalMeta';
import { Modal } from '../../components/Modal';
import { legalStyles as s, legalStateColor } from './legalStyles';

export function LegalVersionDetail({ version, onPublished, onClose }: {
  version: LegalVersion; onPublished: () => void; onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function publish() {
    if (version.status !== 'draft' || busy || !confirming) return;
    setBusy(true); setError('');
    try { await publishLegalVersion(version.version_id); onPublished(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No fue posible publicar la versión.'); }
    finally { setBusy(false); }
  }
  return <Modal title={`${LEGAL_NAMES[version.doc_type]} · versión ${version.semver}`} onClose={onClose} busy={busy} error={error}>
    <div className="tw:mx-auto tw:max-w-4xl tw:space-y-5">
      <div className="tw:grid tw:gap-3 tw:sm:grid-cols-3">
        <div className={s.notice}><p>Estado de la versión</p><span className={`${s.badge} ${legalStateColor(version.display_state)} tw:mt-2`}>{LEGAL_STATES[version.display_state]}</span></div>
        <div className={s.notice}><p>Entrada en vigencia</p><p className="tw:mt-2 tw:font-semibold tw:text-ink">{legalDate(version.effective_at)}</p><p className="tw:mt-1 tw:text-xs">Hora de Santiago</p></div>
        <div className={s.notice}><p>Publicación</p><p className="tw:mt-2 tw:font-semibold tw:text-ink">{version.published_at ? legalDate(version.published_at) : 'Aún no publicada'}</p></div>
      </div>
      <section className={s.section}><h3 className="tw:font-bold">Resumen de los cambios</h3><p className="tw:whitespace-pre-wrap tw:break-words tw:leading-relaxed">{version.changelog}</p></section>
      <section className={s.section}><h3 className="tw:font-bold">Texto del documento</h3><div className="tw:max-h-[45dvh] tw:overflow-y-auto tw:rounded-xl tw:bg-canvas tw:p-4 tw:font-sans tw:text-base tw:leading-loose tw:whitespace-pre-wrap tw:[overflow-wrap:anywhere]" tabIndex={0} role="region" aria-label="Texto completo del documento">{version.content_md}</div></section>
      <details className={s.section}><summary className="tw:cursor-pointer tw:font-semibold">Información de la versión</summary><p className={s.muted}>Creada por {version.created_by_name || 'Responsable no registrado'} · {legalDate(version.created_at)}</p><p className={s.muted}>Última modificación: {legalDate(version.updated_at)}</p></details>
      <div className={s.notice}><p className="tw:font-semibold tw:text-ink">{version.requires_reacceptance ? 'Requiere nueva aceptación de los usuarios' : 'No requiere nueva aceptación'}</p><p className="tw:mt-2">La solicitud de reaceptación está pendiente de conectar con la app móvil.</p></div>
      {version.status === 'draft' ? <section className={s.section}><h3 className="tw:font-bold">Publicar esta versión</h3><p className={s.muted}>Revisa el texto y la fecha. Una vez publicada, esta versión no se podrá editar y se conservará en el histórico.</p>
        {confirming ? <div className={s.error}><h4 className="tw:font-bold">¿Confirmas la publicación de la versión {version.semver}?</h4><p className="tw:mt-2">Su entrada en vigencia está fijada para el {legalDate(version.effective_at)} (Santiago). Publicar no adelanta esa fecha ni sustituye una versión vigente antes de tiempo.</p><div className={`${s.actions} tw:mt-4`}><button type="button" className={s.button} disabled={busy} onClick={() => { setConfirming(false); setError(''); }}>Volver a revisar</button><button type="button" className={`${s.button} ${s.primary}`} disabled={busy} onClick={() => void publish()}>{busy ? 'Publicando…' : 'Confirmar publicación'}</button></div></div>
          : <button type="button" className={`${s.button} ${s.primary}`} onClick={() => setConfirming(true)}>{`Publicar versión ${version.semver}`}</button>}
      </section> : <p className={s.notice}>{version.display_state === 'scheduled' ? 'Esta versión ya está publicada. Entrará en vigencia en la fecha indicada.' : version.display_state === 'current' ? 'Esta es la versión vigente del documento.' : 'Esta versión se conserva como parte del histórico.'} Para introducir cambios, crea una nueva versión.</p>}
    </div>
  </Modal>;
}
