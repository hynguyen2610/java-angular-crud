import { passkeyFailure } from './passkey.service';

describe('passkeyFailure', () => {
  it('gives Touch ID recovery guidance when the browser rejects registration', () => {
    expect(passkeyFailure(new DOMException('The operation was not allowed', 'NotAllowedError')).userMessage)
      .toContain('Try again and approve the Touch ID prompt');
  });

  it('explains how to recover when the device does not support passkeys', () => {
    expect(passkeyFailure(new DOMException('Not supported', 'NotSupportedError')).userMessage)
      .toContain('Use password sign-in or try a supported device');
  });
});
