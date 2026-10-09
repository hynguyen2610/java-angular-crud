import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BackendReadinessService } from '../../core/backend-readiness.service';
import { errorMessage } from '../../core/http-error';
import { PasskeyService } from '../../core/passkey.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Sign in</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Username <input formControlName="username" autocomplete="username" /></label>
        <label>Password <input type="password" formControlName="password" autocomplete="current-password" /></label>
        @if (!backend.ready()) { <p class="backend-starting" role="status">Starting server…</p> }
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="primary" [disabled]="form.invalid || loading() || !backend.ready()">
          {{ !backend.ready() ? 'Server starting…' : loading() ? 'Signing in...' : 'Sign in' }}
        </button>
        @if (passkeys.supported()) {
          <button type="button" class="btn" (click)="signInWithPasskey()" [disabled]="form.controls.username.invalid || loading() || !backend.ready()">
            Sign in with Touch ID / passkey
          </button>
        }
      </form>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  protected passkeys = inject(PasskeyService);
  protected backend = inject(BackendReadinessService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  // Demo credentials prefilled (backend: admin / admin123)
  form = this.fb.nonNullable.group({
    username: ['admin', Validators.required],
    password: ['admin123', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/products';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  signInWithPasskey() {
    const username = this.form.controls.username.value;
    if (!username || !this.backend.ready()) return;
    this.loading.set(true);
    this.error.set(null);
    this.passkeys.login(username).subscribe({
      next: response => {
        this.auth.acceptLogin(response);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/products';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => { this.loading.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
