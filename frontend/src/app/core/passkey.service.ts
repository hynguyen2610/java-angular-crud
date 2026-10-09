import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, defer, switchMap, throwError } from 'rxjs';
import { LoginResponse } from './models';
import { API_URL } from './tokens';
import { SKIP_AUTH_LOGOUT } from './error.interceptor';

interface CeremonyOptions { ceremonyId: string; publicKey: PublicKeyCredentialCreationOptions | PublicKeyCredentialRequestOptions; }

@Injectable({ providedIn: 'root' })
export class PasskeyService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  supported(): boolean { return typeof PublicKeyCredential !== 'undefined' && !!navigator.credentials; }

  register(password: string): Observable<void> {
    return this.http.post<CeremonyOptions>(`${this.api}/auth/passkey/registration/options`, { password }, { context: registrationContext() }).pipe(
      switchMap(options => credentialRequest(() => navigator.credentials.create({ publicKey: creationOptions(options.publicKey as PublicKeyCredentialCreationOptions) }))
        .pipe(switchMap(credential => {
          if (!credential) return throwError(() => passkeyFailure('NotAllowedError'));
          return this.http.post<void>(`${this.api}/auth/passkey/registration/verify`, {
          ceremonyId: options.ceremonyId, response: credentialJson(credential as PublicKeyCredential),
          }, { context: registrationContext() });
        }))),
    );
  }

  login(username: string): Observable<LoginResponse> {
    return this.http.post<CeremonyOptions>(`${this.api}/auth/passkey/assertion/options`, { username }).pipe(
      switchMap(options => credentialRequest(() => navigator.credentials.get({ publicKey: requestOptions(options.publicKey as PublicKeyCredentialRequestOptions) }))
        .pipe(switchMap(credential => {
          if (!credential) return throwError(() => passkeyFailure('NotAllowedError'));
          return this.http.post<LoginResponse>(`${this.api}/auth/passkey/assertion/verify`, {
          ceremonyId: options.ceremonyId, response: credentialJson(credential as PublicKeyCredential),
          }, { params: new HttpParams().set('username', username) });
        }))),
    );
  }
}

function registrationContext(): HttpContext { return new HttpContext().set(SKIP_AUTH_LOGOUT, true); }

function credentialRequest(request: () => Promise<Credential | null>): Observable<Credential | null> {
  return defer(request).pipe(catchError(error => throwError(() => passkeyFailure(error))));
}

export function passkeyFailure(error: unknown): { userMessage: string } {
  const name = error instanceof DOMException ? error.name : typeof error === 'string' ? error : undefined;
  if (name === 'NotAllowedError') {
    return { userMessage: 'Passkey request was cancelled or not allowed. Try again and approve the Touch ID prompt.' };
  }
  if (name === 'AbortError') {
    return { userMessage: 'Passkey request was interrupted. Try again.' };
  }
  if (name === 'InvalidStateError') {
    return { userMessage: 'A passkey already exists in this browser. Use password sign-in, or remove the stale passkey from browser settings before trying again.' };
  }
  if (name === 'NotSupportedError') {
    return { userMessage: 'This browser or device cannot use passkeys. Use password sign-in or try a supported device.' };
  }
  if (name === 'SecurityError') {
    return { userMessage: 'This page is not allowed to use passkeys. Open the app at its configured secure URL and try again.' };
  }
  return { userMessage: 'The browser could not complete the passkey request. Try again, or use password sign-in if it continues.' };
}

// WebAuthn JSON options encode binary members as base64url; the browser API requires ArrayBuffer.
function bytes(value: string): ArrayBuffer { const base64 = value.replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(base64 + '==='.slice((base64.length + 3) % 4)); return Uint8Array.from(raw, c => c.charCodeAt(0)).buffer; }
function creationOptions(value: PublicKeyCredentialCreationOptions): PublicKeyCredentialCreationOptions { return { ...value, challenge: bytes(value.challenge as unknown as string), user: { ...value.user, id: bytes(value.user.id as unknown as string) }, excludeCredentials: value.excludeCredentials?.map(c => ({ ...c, id: bytes(c.id as unknown as string) })) }; }
function requestOptions(value: PublicKeyCredentialRequestOptions): PublicKeyCredentialRequestOptions { return { ...value, challenge: bytes(value.challenge as unknown as string), allowCredentials: value.allowCredentials?.map(c => ({ ...c, id: bytes(c.id as unknown as string) })) }; }
function base64url(value: ArrayBuffer): string { let raw = ''; new Uint8Array(value).forEach(byte => raw += String.fromCharCode(byte)); return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function credentialJson(credential: PublicKeyCredential): string { const response = credential.response as AuthenticatorAttestationResponse | AuthenticatorAssertionResponse; const common = { id: credential.id, rawId: base64url(credential.rawId), type: credential.type, clientExtensionResults: credential.getClientExtensionResults() }; if ('attestationObject' in response) return JSON.stringify({ ...common, response: { clientDataJSON: base64url(response.clientDataJSON), attestationObject: base64url(response.attestationObject) } }); return JSON.stringify({ ...common, response: { clientDataJSON: base64url(response.clientDataJSON), authenticatorData: base64url(response.authenticatorData), signature: base64url(response.signature), userHandle: response.userHandle ? base64url(response.userHandle) : null } }); }
