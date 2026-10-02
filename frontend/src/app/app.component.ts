import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header>
      <strong>Product Manager</strong>
      <a routerLink="/products">Products</a>
      <span class="spacer"></span>
      <button (click)="theme.toggle()">{{ theme.theme() === 'dark' ? 'Light' : 'Dark' }} mode</button>
      @if (auth.isLoggedIn()) {
        <button (click)="auth.logout()">Logout</button>
      }
    </header>
    <main><router-outlet /></main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
}
