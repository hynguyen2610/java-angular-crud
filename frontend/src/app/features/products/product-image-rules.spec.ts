import { HttpErrorResponse } from '@angular/common/http';
import { MAX_IMAGE_BYTES, imageFileError, imageUploadError } from './product-image-rules';

describe('product image rules', () => {
  const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'image', { type });

  it('accepts JPEG, PNG, and WebP files up to 5 MiB', () => {
    expect(imageFileError(file('image/jpeg'))).toBeNull();
    expect(imageFileError(file('image/png'))).toBeNull();
    expect(imageFileError(file('image/webp', MAX_IMAGE_BYTES))).toBeNull();
  });

  it('rejects other types, including SVG, GIF, and an unknown type', () => {
    for (const type of ['image/svg+xml', 'image/gif', '']) {
      expect(imageFileError(file(type))).toBe('Choose a JPEG, PNG, or WebP image.');
    }
  });

  it('rejects files over 5 MiB', () => {
    expect(imageFileError(file('image/png', MAX_IMAGE_BYTES + 1))).toBe('Image must be 5 MiB or smaller.');
  });

  it('maps upload failures to messages, offering retry only for transient ones', () => {
    const http = (status: number, message?: string) =>
      new HttpErrorResponse({ status, error: message ? { message } : null });

    expect(imageUploadError(http(400, 'Image dimensions are too large')))
      .toEqual({ message: 'Image dimensions are too large', retryable: false });
    expect(imageUploadError(http(400)))
      .toEqual({ message: 'That file is not a valid JPEG, PNG, or WebP image.', retryable: false });
    expect(imageUploadError(http(413)))
      .toEqual({ message: 'Image must be 5 MiB or smaller.', retryable: false });
    expect(imageUploadError(http(503)))
      .toEqual({ message: 'Image storage is temporarily unavailable. Your current image is unchanged.', retryable: true });
    expect(imageUploadError(http(0)))
      .toEqual({ message: 'Cannot reach the server. Your current image is unchanged.', retryable: true });
    expect(imageUploadError(http(404, 'Product 1 not found')))
      .toEqual({ message: 'This product no longer exists.', retryable: false });
  });
});
