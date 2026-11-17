import { useEffect, useRef, useState } from 'react';
import type { ActivityRequestInit } from '../lib/requestActivity';
import { createAnalyticsPoller } from '../lib/analyticsRefresh';

export function useAnalyticsRemote<T>(key: string, load: (options?: ActivityRequestInit) => Promise<T>, enabled = true) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });
  const poller = useRef<ReturnType<typeof createAnalyticsPoller> | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    const current = createAnalyticsPoller(async (background, signal) => {
      try {
        const data = await load({ background, signal, cache: 'no-store' });
        if (!cancelled) setState({ key, data, error: '' });
      } catch (error) {
        if (!cancelled) setState(previous => ({ key, data: background && previous.key === key ? previous.data : null,
          error: error instanceof Error ? error.message : 'No fue posible actualizar los indicadores.' }));
      }
    });
    poller.current = current;
    return () => { cancelled = true; current.stop(); };
  }, [key, load]);
  useEffect(() => { poller.current?.setEnabled(enabled); }, [enabled, key, load]);
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : '', previous: state.data };
}
