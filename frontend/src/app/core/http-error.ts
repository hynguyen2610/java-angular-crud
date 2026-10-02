import { HttpErrorResponse } from '@angular/common/http';

/** Turns any thrown error into a message safe to show the user. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is the backend running?';
    return err.error?.message ?? err.message; // `message` comes from Spring's ApiError
  }
  return 'Unexpected error';
}
