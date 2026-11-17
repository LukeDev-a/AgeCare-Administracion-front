import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchPendingMfaCount } from '../api/mfaRecovery';
import { MfaRecoveryCountContext } from '../context/MfaRecoveryCountContext';
import { MFA_RECOVERY_CHANGED, MFA_RECOVERY_UPDATED } from '../lib/mfaRecoveryEvents';

export function MfaRecoveryNotifications({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const owner = user?.id ?? '';
  const enabled = !!owner && user?.role === 'admin' && !!user.permissions?.includes('staff');
  const [snapshot, setSnapshot] = useState<{ owner: string; count: number | null }>({ owner: '', count: null });
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, running = false, rerun = false;
    let previous: number | null = null;
    let controller: AbortController | undefined;
    async function update() {
      if (disposed || running || document.visibilityState === 'hidden') return;
      running = true; controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 15000);
      try {
        const count = await fetchPendingMfaCount(controller.signal);
        if (!disposed) {
          setSnapshot({ owner, count });
          if (count !== previous) {
            previous = count; window.dispatchEvent(new Event(MFA_RECOVERY_UPDATED));
          }
        }
      } catch {
        if (!disposed) { previous = null; setSnapshot({ owner, count: null }); }
      } finally {
        window.clearTimeout(timeout); running = false;
        if (rerun && !disposed) { rerun = false; void update(); }
      }
    }
    const refresh = () => { if (running) rerun = true; else void update(); };
    const resume = () => { if (document.visibilityState === 'visible') void update(); };
    void update();
    const timer = window.setInterval(() => void update(), 60000);
    window.addEventListener('focus', resume);
    window.addEventListener(MFA_RECOVERY_CHANGED, refresh);
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true; controller?.abort(); window.clearInterval(timer);
      window.removeEventListener('focus', resume);
      window.removeEventListener(MFA_RECOVERY_CHANGED, refresh);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [enabled, owner]);
  return <MfaRecoveryCountContext.Provider value={enabled && snapshot.owner === owner ? snapshot.count : null}>{children}</MfaRecoveryCountContext.Provider>;
}
