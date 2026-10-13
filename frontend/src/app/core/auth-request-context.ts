import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Opt out only for an authenticated action which handles a 401 locally. */
export const SKIP_AUTH_LOGOUT = new HttpContextToken<boolean>(() => false);

/** Prevent a best-effort logout audit failure from recursively triggering logout. */
export function logoutAuditContext(): HttpContext {
  return new HttpContext().set(SKIP_AUTH_LOGOUT, true);
}
