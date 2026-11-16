import { useState } from 'react';
import { importNewsFile, type NewsImportResult } from '../../api/content';
import { Modal } from '../../components/Modal';
import { contentStyles as ui } from './contentStyles';

export function ImportNewsModal({ onClose, onImported }: {
  onClose: () => void; onImported: (result: NewsImportResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Modal title="Importar noticias desde un archivo" onClose={onClose} dirty={!!file} busy={busy} error={error}>
    <div className="tw:space-y-6">
      <p>Usa esta opción si la recopilación automática no puede conectarse al medio. El archivo se valida antes de guardar y las noticias existentes no se duplican.</p>
      <ol className="tw:list-decimal tw:space-y-3 tw:pl-6">
        <li><a className="tw:font-semibold tw:text-brand-ink tw:underline" href="https://www.cuentamealgobueno.com/wp-json/wp/v2/posts?per_page=20&_embed=author" target="_blank" rel="noreferrer">Abre las noticias de Cuéntame Algo Bueno</a> en tu navegador.</li>
        <li>Cuando veas el texto con llaves y corchetes, pulsa Ctrl + S y guárdalo como <strong>noticias.json</strong>. Debe ser JSON, no una página HTML. Cada descarga incluye hasta 20 noticias.</li>
        <li>Selecciona el archivo y pulsa «Importar noticias». Después podrás revisar la procedencia y solicitar la adaptación con Gemini.</li>
      </ol>
      <label className={ui.label}>Archivo de noticias (.json)
        <input className={ui.field} type="file" accept=".json,application/json" disabled={busy} aria-describedby="news-import-help"
          onChange={event => { setFile(event.target.files?.[0] ?? null); setError(''); }} />
      </label>
      <p id="news-import-help" className="tw:text-sm tw:text-muted">Máximo 2 MB y 100 noticias por archivo. Solo se admiten enlaces de Cuéntame Algo Bueno. La importación no confirma autoría ni permisos, no solicita IA y no publica contenido.</p>
      <div className={`${ui.actions} tw:justify-end`}>
        <button type="button" className={`${ui.button} ${ui.primary}`} disabled={!file || busy} onClick={async () => {
          if (!file || busy) return;
          setBusy(true); setError('');
          try { onImported(await importNewsFile(file)); }
          catch (exception) { setError(exception instanceof Error ? exception.message : 'No fue posible importar el archivo.'); }
          finally { setBusy(false); }
        }}>{busy ? 'Importando…' : 'Importar noticias'}</button>
      </div>
    </div>
  </Modal>;
}
