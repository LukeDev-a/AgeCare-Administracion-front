export const MFA_RECOVERY_CHANGED = 'agecare-mfa-recoveries-changed';
export const MFA_RECOVERY_UPDATED = 'agecare-mfa-recoveries-updated';

export function notifyMfaRecoveryChanged() {
  window.dispatchEvent(new Event(MFA_RECOVERY_CHANGED));
}
