import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { ProfileService } from '../../core/profile.service';
import { profileValidators } from './profile-validation';
import { PasskeyService } from '../../core/passkey.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Profile</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Username
          <input formControlName="username" autocomplete="username" />
          @if (form.controls.username.touched && form.controls.username.errors; as errors) {
            <small class="err">{{ errors['server'] ?? 'Username is required (max 100 characters)' }}</small>
          }
        </label>
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="primary" [disabled]="loading() || saving()">
          {{ saving() ? 'Saving...' : 'Save profile' }}
        </button>
        <a class="btn" routerLink="/products">Cancel</a>
      </form>
      @if (passkeys.supported()) {
        <hr />
        <h3>Touch ID / passkey</h3>
        <label>Confirm current password <input type="password" [formControl]="passkeyPassword" autocomplete="current-password" /></label>
        @if (passkeyError()) { <p class="err">{{ passkeyError() }}</p> }
        <button type="button" class="btn" (click)="registerPasskey()" [disabled]="passkeyLoading() || passkeyPassword.invalid">
          {{ passkeyLoading() ? 'Registering...' : 'Register this Mac passkey' }}
        </button>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly passkeys = inject(PasskeyService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  passkeyLoading = signal(false);
  passkeyError = signal<string | null>(null);
  form = this.fb.nonNullable.group({ username: ['', profileValidators.username] });
  passkeyPassword = this.fb.nonNullable.control('', Validators.required);

  ngOnInit() {
    this.profiles.get().subscribe({
      next: profile => {
        this.form.controls.username.setValue(profile.username);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.form.controls.username.setErrors(null);
    this.profiles.update(this.form.getRawValue().username).subscribe({
      next: () => {
        this.auth.logout();
      },
      error: err => {
        this.saving.set(false);
        this.showServerError(err);
      },
    });
  }

  registerPasskey() {
    if (this.passkeyPassword.invalid) return;
    this.passkeyLoading.set(true);
    this.passkeyError.set(null);
    this.passkeys.register(this.passkeyPassword.value).subscribe({
      next: () => { this.passkeyPassword.setValue(''); this.passkeyLoading.set(false); },
      error: err => { this.passkeyLoading.set(false); this.passkeyError.set(errorMessage(err)); },
    });
  }

  private showServerError(err: unknown) {
    if (err instanceof HttpErrorResponse && err.error?.errors?.username) {
      this.form.controls.username.setErrors({ server: err.error.errors.username });
      this.form.controls.username.markAsTouched();
    }
    this.error.set(errorMessage(err));
  }
}
