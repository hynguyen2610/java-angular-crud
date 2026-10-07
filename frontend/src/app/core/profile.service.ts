import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { UserProfile } from './models';
import { API_URL } from './tokens';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  get() {
    return this.http.get<UserProfile>(`${this.api}/auth/me`);
  }

  update(username: string) {
    return this.http.put<UserProfile>(`${this.api}/auth/me`, { username });
  }
}
