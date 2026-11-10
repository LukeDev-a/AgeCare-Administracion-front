export class LoginError extends Error {
  retryAfterSeconds: number | null;
  constructor(message: string, details: unknown) {
    super(message);
    const seconds = Array.isArray(details) ? details[0]?.retry_after_seconds : undefined;
    this.retryAfterSeconds = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds) : null;
  }
}

export function lockoutRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function lockoutTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
