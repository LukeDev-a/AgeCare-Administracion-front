import { accessRequest } from './accountAccess';

export interface OwnProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  permissions: string[];
  last_login_at: string | null;
  mfa_enabled: boolean;
  mfa_required: boolean;
}

export const fetchOwnProfile = (signal?: AbortSignal) =>
  accessRequest<OwnProfile>('/auth/me', undefined, true, signal);
