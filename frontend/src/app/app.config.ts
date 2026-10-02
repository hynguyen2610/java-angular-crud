import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { errorInterceptor } from './core/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Order matters: auth adds the header first, error handling sees the response last.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
