const ACCESS_KEY = "agecare_access_token";
const REFRESH_KEY = "agecare_refresh_token";

export function createSessionClient(
  baseUrl: string,
  onToken: (token: string) => void,
  onExpired: () => void,
  transport: typeof fetch = (...args) => fetch(...args),
) {
  type Tokens = { access_token: string; refresh_token: string };
  let pendingRefresh: { token: string; promise: Promise<Tokens | null> } | null = null;

  function clear() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    onExpired();
  }

  function save(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
    onToken(access);
  }

  function rotate(token: string): Promise<Tokens | null> {
    if (pendingRefresh?.token === token) return pendingRefresh.promise;
    const promise = (async () => {
      const response = await transport(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error("No se pudo renovar la sesión.");
      const data = await response.json();
      if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
        throw new Error("Respuesta de renovación inválida.");
      }
      return data as Tokens;
    })().finally(() => {
      if (pendingRefresh?.promise === promise) pendingRefresh = null;
    });
    pendingRefresh = { token, promise };
    return promise;
  }

  async function refresh(): Promise<string | null> {
    const previousRefresh = sessionStorage.getItem(REFRESH_KEY);
    if (!previousRefresh) {
      clear();
      return null;
    }
    const data = await rotate(previousRefresh);
    // Un logout o un nuevo login invalida esta respuesta pendiente.
    if (sessionStorage.getItem(REFRESH_KEY) !== previousRefresh) {
      return sessionStorage.getItem(ACCESS_KEY);
    }
    if (!data) {
      clear();
      return null;
    }
    save(data.access_token, data.refresh_token);
    return data.access_token;
  }

  function isFresh(access: string | null): access is string {
    if (!access) return false;
    try {
      const payload = JSON.parse(atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 60_000) {
        return true;
      }
    } catch {
      // El servidor sigue siendo quien valida el JWT; aquí solo anticipamos su expiración.
    }
    return false;
  }

  async function ensureFresh() {
    const access = sessionStorage.getItem(ACCESS_KEY);
    if (!access) return sessionStorage.getItem(REFRESH_KEY) ? refresh() : null;
    return isFresh(access) ? access : refresh();
  }

  async function request(path: string, options: RequestInit = {}) {
    const access = await ensureFresh();
    const send = (current: string | null) => {
      const headers = new Headers(options.headers);
      if (current) headers.set("Authorization", `Bearer ${current}`);
      if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return transport(`${baseUrl}${path}`, { ...options, headers });
    };
    const response = await send(access);
    if (response.status !== 401 || !access) return response;
    // Otra consulta puede haber renovado el token mientras esta estaba en vuelo.
    const latest = sessionStorage.getItem(ACCESS_KEY);
    const renewed = latest && latest !== access ? latest : await refresh();
    if (!renewed) return response;
    const retried = await send(renewed);
    if (retried.status === 401 && sessionStorage.getItem(ACCESS_KEY) === renewed) clear();
    return retried;
  }

  async function logout() {
    const access = sessionStorage.getItem(ACCESS_KEY);
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    const rotating = pendingRefresh?.token === refreshToken ? pendingRefresh.promise : null;
    // Salir del navegador no depende de la disponibilidad del servidor.
    clear();
    if (refreshToken) {
      const tokens = rotating ? await rotating : isFresh(access)
        ? { access_token: access, refresh_token: refreshToken }
        : await rotate(refreshToken);
      if (tokens) {
        await transport(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
          signal: AbortSignal.timeout(10_000),
        });
      }
    }
  }

  return { request, ensureFresh, save, clear, logout };
}
