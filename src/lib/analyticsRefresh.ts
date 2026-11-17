export interface RefreshEnvironment {
  active: () => boolean;
  now: () => number;
  later: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
  subscribe: (callback: () => void) => () => void;
}

export function browserRefreshEnvironment(): RefreshEnvironment | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return {
    active: () => document.visibilityState === 'visible' && window.navigator.onLine !== false,
    now: Date.now, later: setTimeout, cancel: clearTimeout,
    subscribe(callback) {
      window.addEventListener('focus', callback);
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      document.addEventListener('visibilitychange', callback);
      return () => {
        window.removeEventListener('focus', callback);
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
        document.removeEventListener('visibilitychange', callback);
      };
    },
  };
}

/** No despierta servicios desde pestañas ocultas ni acumula consultas lentas. */
export function createAnalyticsPoller(task: (background: boolean, signal?: AbortSignal) => Promise<void>,
  environment = browserRefreshEnvironment(), interval = 60_000) {
  let stopped = false, enabled = true, running = false;
  let lastStarted: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const active = () => !stopped && enabled && (!environment || environment.active());
  function cancelTimer() {
    if (timer !== undefined) environment?.cancel(timer);
    timer = undefined;
  }
  function arm() {
    cancelTimer();
    if (environment && active()) timer = environment.later(() => { void run(true); }, interval);
  }
  async function run(background: boolean) {
    if (!active() || running) return;
    const now = environment?.now() ?? Date.now();
    if (background && lastStarted !== undefined && now - lastStarted < 1000) { arm(); return; }
    running = true; cancelTimer(); lastStarted = now;
    controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
    try { await task(background, controller?.signal); }
    catch { /* El consumidor conserva/muestra su error; el siguiente ciclo reintenta. */ }
    finally { running = false; arm(); }
  }
  const unsubscribe = environment?.subscribe(() => {
    if (!active()) cancelTimer();
    else void run(true);
  });
  void run(false);
  return {
    setEnabled(value: boolean) {
      const wasEnabled = enabled;
      enabled = value;
      if (!enabled) cancelTimer();
      else if (!wasEnabled) void run(true);
    },
    stop() { stopped = true; cancelTimer(); controller?.abort(); unsubscribe?.(); },
  };
}
