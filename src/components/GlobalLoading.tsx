import { useSyncExternalStore } from 'react';
import { getRequestActivity, subscribeRequestActivity } from '../lib/requestActivity';

export function GlobalLoading() {
  const visible = useSyncExternalStore(subscribeRequestActivity, getRequestActivity, () => false);
  if (!visible) return null;

  return <div className="tw:pointer-events-none tw:fixed tw:inset-0 tw:z-[2000] tw:flex tw:items-center tw:justify-center tw:bg-black/10">
    <div role="status" aria-live="polite" aria-atomic="true" className="tw:flex tw:flex-col tw:items-center tw:gap-4 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-8 tw:py-6 tw:text-ink tw:shadow-xl">
      <span aria-hidden="true" className="tw:size-10 tw:rounded-full tw:border-4 tw:border-solid tw:border-stroke tw:border-t-brand tw:motion-safe:animate-spin" />
      <span className="tw:text-base tw:font-semibold">Cargando…</span>
    </div>
  </div>;
}
