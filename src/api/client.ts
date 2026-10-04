import { createSessionClient } from '../lib/sessionClient';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1/admin';

const ACCESS_TOKEN_KEY = 'agecare_access_token';
const REFRESH_TOKEN_KEY = 'agecare_refresh_token';

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setSession(data: SessionTokens): void {
  session.save(data.access_token, data.refresh_token);
}

export function clearSession(): void {
  session.clear();
}

const session = createSessionClient(API_BASE_URL, () => {}, () => {
  window.dispatchEvent(new Event('agecare-session-expired'));
});

export const apiFetch = session.request;
export const ensureFreshSession = session.ensureFresh;
export const logoutSession = session.logout;
