import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, filter, map, of, switchMap, take, timer } from 'rxjs';

interface HealthResponse {
  status?: string;
}

/** Polls the public health endpoint until Spring Boot is ready to receive browser requests. */
@Injectable({ providedIn: 'root' })
export class BackendReadinessService {
  private readonly http = inject(HttpClient);

  readonly ready = signal(false);

  constructor() {
    timer(0, 2_000)
      .pipe(
        switchMap(() => this.http.get<HealthResponse>('/actuator/health').pipe(
          map(response => response.status === 'UP'),
          catchError(() => of(false)),
        )),
        filter(Boolean),
        take(1),
      )
      .subscribe(() => this.ready.set(true));
  }
}
