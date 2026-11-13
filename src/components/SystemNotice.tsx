import { useEffect, useState } from 'react';
import { fetchSystemNotice, type SystemNotice as Notice } from '../api/runtimeSettings';

export function SystemNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const value = await fetchSystemNotice(controller.signal);
        if (!controller.signal.aborted) { setNotice(value); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) { setNotice(null); setFailed(true); }
      } finally { inFlight = false; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('agecare-settings-changed', onFocus);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener('focus', onFocus); window.removeEventListener('agecare-settings-changed', onFocus);
    };
  }, []);
  if (failed) return <p role="status" className="tw:mb-5 tw:text-sm tw:text-muted">No se pudo consultar el aviso general. Se volverá a intentar automáticamente.</p>;
  if (!notice?.enabled) return null;
  return <aside aria-label="Aviso general" role="status" className="tw:mb-6 tw:space-y-2 tw:rounded-xl tw:border tw:border-solid tw:border-brand tw:bg-brand-soft tw:p-5 tw:text-ink">
    <h2 className="tw:text-lg tw:font-semibold tw:break-words">{notice.title}</h2>
    <p className="tw:whitespace-pre-wrap tw:break-words">{notice.body}</p>
  </aside>;
}
