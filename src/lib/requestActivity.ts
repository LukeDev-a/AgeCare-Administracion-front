let pending = 0;
let visible = false;
let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export const getRequestActivity = () => visible;

export function subscribeRequestActivity(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setVisible(value: boolean) {
  if (visible === value) return;
  visible = value;
  listeners.forEach(listener => listener());
}

export async function activityFetch(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  clearTimeout(hideTimer);
  pending += 1;
  if (!visible) shownAt = Date.now();
  setVisible(true);
  try {
    return await fetch(input, options);
  } finally {
    pending -= 1;
    if (pending === 0) {
      // Mantener el indicador perceptible sin retrasar la respuesta de la API.
      hideTimer = setTimeout(() => setVisible(false), Math.max(0, 300 - (Date.now() - shownAt)));
    }
  }
}
