const ACCESS_KEY = "agecare_access_token";
const REFRESH_KEY = "agecare_refresh_token";

export function createSessionClient(
  baseUrl: string,
  onToken: (token: string) => void,
  onExpired: () => void,
) {
  let pendingRefresh: Promise<string | null> | null = null;

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

  function refresh(): Promise<string | null> {
    if (pendingRefresh) return pendingRefresh;
    const previousRefresh = sessionStorage.getItem(REFRESH_KEY);
    if (!previousRefresh) {
      clear();
      return Promise.resolve(null);
    }
    // Las consultas simultáneas comparten una única rotación del refresh token.
    pendingRefresh = (async () => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: previousRefresh }),
      });
      // Un logout o un nuevo login invalida esta respuesta pendiente.
      if (sessionStorage.getItem(REFRESH_KEY) !== previousRefresh) {
        return sessionStorage.getItem(ACCESS_KEY);
      }
      if (response.status === 401 || response.status === 403) {
        clear();
        return null;
      }
      if (!response.ok) throw new Error("No se pudo renovar la sesión.");
      const data = await response.json();
      if (sessionStorage.getItem(REFRESH_KEY) !== previousRefresh) {
        return sessionStorage.getItem(ACCESS_KEY);
      }
      if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
        throw new Error("Respuesta de renovación inválida.");
      }
      save(data.access_token, data.refresh_token);
      return data.access_token as string;
    })().finally(() => {
      pendingRefresh = null;
    });
    return pendingRefresh;
  }

  async function ensureFresh() {
    const access = sessionStorage.getItem(ACCESS_KEY);
    if (!access) return sessionStorage.getItem(REFRESH_KEY) ? refresh() : null;
    try {
      const payload = JSON.parse(atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 60_000) {
        return access;
      }
    } catch {
      // El servidor sigue siendo quien valida el JWT; aquí solo anticipamos su expiración.
    }
    return refresh();
  }

  async function request(path: string, options: RequestInit = {}) {
    const access = await ensureFresh();
    const send = (current: string | null) => {
      const headers = new Headers(options.headers);
      if (current) headers.set("Authorization", `Bearer ${current}`);
      if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return fetch(`${baseUrl}${path}`, { ...options, headers });
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
    try {
      const access = await ensureFresh();
      const refreshToken = sessionStorage.getItem(REFRESH_KEY);
      if (access && refreshToken) {
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      clear();
    }
  }

  return { request, ensureFresh, save, clear, logout };
}
