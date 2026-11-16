import { useState, type FormEvent } from 'react';
import { createLegalDraft, type LegalDocType } from '../../api/legal';
import { LEGAL_NAMES, legalDay } from '../../lib/legalMeta';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../components/Modal';
import { legalStyles as s } from './legalStyles';

export function LegalDraftForm({ initialType, earliestMajorDate, onSaved, onCancel }: {
  initialType: LegalDocType; earliestMajorDate: string; onSaved: (id: string) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const [type, setType] = useState(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  if (user?.role !== 'admin') return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || user?.role !== 'admin') return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const version = await createLegalDraft(type, {
        semver: String(data.get('semver') ?? '').trim(), content_md: String(data.get('content_md') ?? '').trim(),
        changelog: String(data.get('changelog') ?? '').trim(), effective_date: String(data.get('effective_date') ?? ''),
      });
      onSaved(version.version_id);
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible crear el borrador.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Nueva versión en borrador" onClose={onCancel} dirty={dirty} busy={busy} error={error}>
    <div className="tw:mx-auto tw:max-w-4xl tw:space-y-5">
      <p className={s.notice}>Crear un borrador no publica el documento. Después podrás revisar el texto y confirmar su publicación.</p>
      <form className="tw:space-y-5" onChange={() => setDirty(true)} onSubmit={event => void submit(event)}>
        <fieldset disabled={busy} className="tw:min-w-0 tw:space-y-5 tw:border-0 tw:p-0">
          <section className={s.section}><h3 className="tw:font-bold">1. Identifica la versión</h3><div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
            <label className={s.label}>Documento<select className={s.field} aria-label="Documento del borrador" value={type} onChange={event => { setType(event.target.value as LegalDocType); setDirty(true); }}>{Object.entries(LEGAL_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className={s.label}>Versión (mayor.menor)<input className={s.field} name="semver" required pattern="[0-9]+\.[0-9]+" maxLength={10} placeholder="Ej.: 1.1" /></label>
          </div><p className={s.muted}>Ejemplo: 1.1 es un cambio menor; 2.0 cambia la versión mayor y exige nueva aceptación.</p></section>
          <section className={s.section}><h3 className="tw:font-bold">2. Prepara el texto</h3>
            <label className={s.label}>Texto del documento<textarea className={`${s.field} tw:min-h-72 tw:leading-relaxed`} aria-label="Texto del documento" name="content_md" required minLength={100} rows={12} placeholder="Escribe el texto completo del documento…" /><span className={s.muted}>Mínimo 100 caracteres. Puedes utilizar formato Markdown.</span></label>
            <label className={s.label}>Resumen de los cambios<textarea className={s.field} aria-label="Resumen de los cambios" name="changelog" required minLength={10} maxLength={2000} rows={3} placeholder="Explica qué cambia respecto de la versión anterior." /><span className={s.muted}>Entre 10 y 2.000 caracteres.</span></label>
          </section>
          <section className={s.section}><h3 className="tw:font-bold">3. Define la entrada en vigencia</h3>
            <label className={`${s.label} tw:max-w-sm`}>Fecha de entrada en vigencia<input className={s.field} name="effective_date" type="date" required defaultValue={earliestMajorDate} /></label>
            <p className={s.muted}>La vigencia comienza a medianoche de Santiago. Un cambio mayor necesita quince días completos desde su publicación.</p>
            <details className={s.notice}><summary className="tw:cursor-pointer tw:font-semibold tw:text-ink">Fecha recomendada para un cambio mayor</summary><p className="tw:mt-2">Si publicas hoy, la primera fecha disponible es {legalDay(earliestMajorDate)}. Si publicas más adelante, esta fecha puede cambiar; el sistema volverá a validarla.</p></details>
          </section>
        </fieldset>
        <div className={`${s.actions} tw:justify-end`}><button className={`${s.button} ${s.primary}`} type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear borrador'}</button></div>
      </form>
    </div>
  </Modal>;
}
