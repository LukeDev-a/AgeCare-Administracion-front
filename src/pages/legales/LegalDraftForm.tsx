import { useState, type FormEvent } from 'react';
import { createLegalDraft, type LegalDocType } from '../../api/legal';
import { LEGAL_NAMES, legalDay } from '../../lib/legalMeta';
import { useAuth } from '../../auth/AuthContext';

export function LegalDraftForm({ initialType, earliestMajorDate, onSaved, onCancel }: {
  initialType: LegalDocType; earliestMajorDate: string; onSaved: (id: string) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const [type, setType] = useState(initialType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
  return <section className="card">
    <h2 className="card-title">Nueva versión en borrador</h2>
    <p className="mini-note">Ejemplo: 1.1 es un cambio menor; 2.0 cambia la versión mayor y exige reaceptación. Crear el borrador no publica el documento.</p>
    <p className="mini-note">Un cambio mayor necesita quince días completos desde la publicación. Primera fecha disponible hoy: {legalDay(earliestMajorDate)}, a medianoche de Santiago. Si publicas más tarde, puede cambiar.</p>
    <form className="ticket-form" onSubmit={event => void submit(event)}>
      <fieldset disabled={busy} className="wide" style={{ border: 0, padding: 0, display: 'contents' }}>
        <label>Documento<select aria-label="Documento del borrador" value={type} onChange={event => setType(event.target.value as LegalDocType)}>
          {Object.entries(LEGAL_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Versión (mayor.menor)<input name="semver" required pattern="[0-9]+\.[0-9]+" maxLength={10} placeholder="1.1" /></label>
        <label>Fecha de entrada en vigencia<input name="effective_date" type="date" required defaultValue={earliestMajorDate} /></label>
        <label className="wide">Texto del documento (Markdown, mínimo 100 caracteres)<textarea name="content_md" required minLength={100} rows={12} /></label>
        <label className="wide">Resumen de los cambios<textarea name="changelog" required minLength={10} maxLength={2000} rows={3} /></label>
      </fieldset>
      {error && <p role="alert" className="wide">{error}</p>}
      <div className="ticket-form-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className="action-button" type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Crear borrador'}</button></div>
    </form>
  </section>;
}
