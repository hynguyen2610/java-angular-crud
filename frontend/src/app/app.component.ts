import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { BackendReadinessService } from './core/backend-readiness.service';
import { ThemeService } from './core/theme.service';
import { NotificationCenterComponent } from './core/notification-center.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NotificationCenterComponent],
  template: `
    <header>
      <strong>Product Manager</strong>
      <a routerLink="/products">Products</a>
      <span class="spacer"></span>
      <button (click)="theme.toggle()">{{ theme.theme() === 'dark' ? 'Light' : 'Dark' }} mode</button>
      @if (auth.isLoggedIn()) {
        <a routerLink="/profile">Profile</a>
        <button (click)="auth.logout()">Logout</button>
      }
    </header>
    @if (!backend.ready()) {
      <p class="backend-starting" role="status">Starting server…</p>
    }
    <app-notification-center />
    <main><router-outlet /></main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  backend = inject(BackendReadinessService);
  theme = inject(ThemeService);
}
