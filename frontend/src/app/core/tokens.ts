import { InjectionToken } from '@angular/core';

/**
 * Base URL of the Spring API. Default '/api' works with the dev proxy (proxy.conf.json).
 * To point at another host, override in app.config.ts:
 *   { provide: API_URL, useValue: 'https://api.example.com/api' }
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
