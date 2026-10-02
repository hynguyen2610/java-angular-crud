import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { LoginResponse } from './models';
import { API_URL } from './tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = inject(API_URL);
  private router = inject(Router);

  private _token = signal<string | null>(this.read());
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, { username, password })
      .pipe(tap(res => this.store(res.token)));
  }

  logout() {
    this.store(null);
    this.router.navigateByUrl('/login');
  }

  private read(): string | null {
    try { return localStorage.getItem('token'); } catch { return null; }
  }

  private store(token: string | null) {
    this._token.set(token);
    try {
      token ? localStorage.setItem('token', token) : localStorage.removeItem('token');
    } catch { /* storage unavailable */ }
  }
}
