import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from '../../core/http-error';

/** Mirrors the server's limits for fast feedback; the server's byte checks remain authoritative. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MiB or smaller.';
  return null;
}

/** Retry only helps when the same file could succeed later (storage outage, lost connection). */
export function imageUploadError(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof HttpErrorResponse) {
    switch (err.status) {
      case 400:
        return { message: err.error?.message ?? 'That file is not a valid JPEG, PNG, or WebP image.', retryable: false };
      case 404:
        return { message: 'This product no longer exists.', retryable: false };
      case 413:
        return { message: 'Image must be 5 MiB or smaller.', retryable: false };
      case 503:
        return { message: 'Image storage is temporarily unavailable. Your current image is unchanged.', retryable: true };
      case 0:
        return { message: 'Cannot reach the server. Your current image is unchanged.', retryable: true };
    }
  }
  return { message: errorMessage(err), retryable: false };
}
