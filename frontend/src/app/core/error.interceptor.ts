import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Opt out only for an authenticated action which handles a 401 locally. */
export const SKIP_AUTH_LOGOUT = new HttpContextToken<boolean>(() => false);

/** Global handling: an expired or invalid token (401) sends the user back to login. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.context.get(SKIP_AUTH_LOGOUT) && !req.url.endsWith('/auth/login')) {
        auth.logout();
      }
      return throwError(() => err); // still let the component show a message
    }),
  );
};
